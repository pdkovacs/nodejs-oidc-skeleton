import "source-map-support/register.js";
import { getLogger, setDefaultLogLevel } from "./logger.js";

import express from "express";

import { type AddressInfo } from "node:net";
import helmet from "helmet";
import { type AppConfig, readConfiguration } from "./configuration.js";
import { type OidcHandler, createOidcHandler } from "./security/authentication/oidc.js";
import session from "express-session";
import { hasRequiredPrivileges } from "./security/authorization/privileges/priv-enforcement.js";
import path from "node:path";
import pug from "pug";
import { setupCallbackRoute } from "./security/authentication/oidc-express.js";
import { isNil } from "lodash-es";
import { getCurrentlyUsedAmount, startConsuming, stopConsuming } from "./memory-consumer.js";

const appdir = new URL(".", import.meta.url).pathname;

interface AppServer {
	readonly address: () => AddressInfo
	readonly shutdown: () => Promise<void>
}

const logServerStart = (server: AppServer): void => {
	const host = (server.address()).address;
	const port = (server.address()).port;

	getLogger("logServerStart").info("The server is listening at http://%s:%s", host, port);
};

const setupPage = (router: express.Router): void => {
	router.get("/favicon.ico", (_, res) => {
		res.sendStatus(201);
	});

	router.get("/", (req, res) => {
		const logger = getLogger("route:///");
		if (isNil(req.session.authentication)) {
			logger.debug("rendering 'unauth'...");
			res.render("unauth", {
				user: {},
				view: {
					title: ""
				}
			});
			return;
		}
		logger.debug("rendering 'index'...");
		res.render("index", {
			view: {},
			user: {
				name: req.session.authentication?.username,
				privileges: req.session.authentication?.privileges
			}
		}
		);
	});
};

const setupAuthRoutes = async (router: express.Router, oidcHandler: OidcHandler, loginUrl: string, logoutUrl: string): Promise<void> => {
	router.get("/login", (req, res) => {
		const logger = getLogger("route:///login");
		try {
			const auhtRUrl = oidcHandler.getAuthorizationUrl(req);
			res.redirect(auhtRUrl);
		} catch (error) {
			logger.error("failed to process login: %o", error);
			res.sendStatus(401);
		}
	});

	await setupCallbackRoute(router, loginUrl, oidcHandler);

	router.use((req, res, next) => {
		const logger = getLogger("oidc://authentication-check");
		const authentication = req.session.authentication;
		logger.debug("checking authentication: %o", authentication);
		if (isNil(authentication)) {
			res.redirect(loginUrl);
			return;
		}
		hasRequiredPrivileges(req)
			.then(
				has => {
					if (has) {
						next();
						return;
					}
					logger.debug("not enough privileges");
					const template = pug.compileFile(path.join(appdir, "views/includes/authorization-error.pug"));
					const markup = template();
					res.send(markup);
				}
			).catch(error => {
				logger.error("error while evaluating authentication information: %o", error);
				res.sendStatus(401);
			});
	});

	router.post("/logout", (req, res) => {
		const logger = getLogger("route:///logout");
		try {
			delete req.session.authentication;
			if (!isNil(logoutUrl)) {
				res.setHeader("HX-Redirect", logoutUrl).end();
			}
		} catch (error) {
			logger.error("failed to process logout: %o", error);
			res.send(pug.compile("span.error failed to logout")());
		}
	});
};

const setupRoutes = (router: express.Router): void => {
	router.get("/authorization-tests", (req, res) => {
		const template = pug.compileFile(path.join(appdir, "views/includes/page-views/authorization-tests.pug"));
		const markup = template({
			view: {
				title: "Test authorization"
			},
			user: {
				name: req.session.authentication?.username,
				privileges: req.session.authentication?.privileges
			}
		});
		res.send(markup);
	});

	router.post("/authorization-tests/hello", (req, res) => {
		const logger = getLogger("route:////authorization-tests/hello");
		const name: string = req.query?.name as string;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});

	router.post("/authorization-tests/hello/other", (req, res) => {
		const logger = getLogger("route:///authorization-tests/hello/other");
		logger.debug("body: %o", req.body);
		const name: string = req.body.buddy;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});

	router.get("/memory-consumption-increase-tests", (req, res) => {
		const template = pug.compileFile(path.join(appdir, "views/includes/page-views/memory-consumption-increase-tests.pug"));
		const markup = template({
			view: {
				title: "Test used memory increase"
			},
			user: {
				name: req.session.authentication?.username,
				privileges: req.session.authentication?.privileges
			}
		});
		res.send(markup);
	});

	router.post("/memory-consumption-increase-tests/start", (req, res) => {
		const logger = getLogger("route:///memory-consumption-increase-tests/start");
		logger.debug("incoming request: req.body: %o", req.body);

		const incrementInterval: number = parseInt(req.body?.increment_interval as string, 10);
		logger.debug("incoming request: incrementInterval: %d", incrementInterval);
		const incrementSize: number = parseInt(req.body?.increment_size as string, 10);
		logger.debug("incoming request: incrementSize: %d", incrementSize);
		startConsuming(incrementSize, incrementInterval);
		res.end();
	});

	router.post("/memory-consumption-increase-tests/stop", (req, res) => {
		const logger = getLogger("route:///memory-consumption-increase-tests/stop");
		logger.debug("incoming request");
		stopConsuming();
	});

	router.get("/memory-consumption-increase-tests/poll", (req, res) => {
		const logger = getLogger("route:///memory-consumption-increase-tests/poll");
		const currentlyUsedAmount = getCurrentlyUsedAmount();
		logger.debug("currentlyUsedAmount: %d", currentlyUsedAmount);
		if (currentlyUsedAmount < 0) {
			res.sendStatus(286);
		} else {
			const template = pug.compileFile(path.join(appdir, "views/includes/current-memory-consumption.pug"));
			const markup = template({ currentlyUsedAmount });
			res.send(markup);
		}
	});
};

const startServer = async (appConfig: AppConfig): Promise<AppServer> => {
	setDefaultLogLevel("debug");
	const logger = getLogger("app");

	const app = express();
	app.use(express.static(path.join(appdir, "views/assets")));
	app.set("view engine", "pug");
	app.set("views", path.join(appdir, "views"));

	app.use(session({
		secret: "my-secret", // a secret string used to sign the session ID cookie
		resave: false, // don't save session if unmodified
		saveUninitialized: false // don't create session until something stored,
	}));

	const directives = helmet.contentSecurityPolicy.getDefaultDirectives();
	app.use(helmet({
		contentSecurityPolicy: {
			useDefaults: false,
			directives: {
				...directives,
				"script-src-elem": ["'self'", "unpkg.com", "cdn.jsdelivr.net"]
			}
		}
	}));
	app.set("trust proxy", true);
	app.use(express.urlencoded({
		extended: true
	}));

	const router: express.Router = express.Router();

	setupPage(router);

	const oidcHandler: OidcHandler = await createOidcHandler({
		clientId: appConfig.oidcClientId,
		clientSecret: appConfig.oidcClientSecret,
		metaDataUrl: appConfig.oidcTokenIssuer,
		callbackUrl: appConfig.oidcCallbackUrl
	});
	await setupAuthRoutes(router, oidcHandler, "/login", appConfig.oidcLogoutUrl);

	setupRoutes(router);
	app.use(router);

	return await new Promise(resolve => {
		const httpServer = app.listen(
			appConfig.serverPort,
			appConfig.serverHost,
			() => {
				resolve({
					address: () => httpServer.address() as AddressInfo,
					shutdown: async () => {
						logger.info("server shutting down...");
						httpServer.close(error => {
							logger.error("error while shutting down http server: %o", error);
						});
					}
				});
			}
		);
	});
};

readConfiguration()
	.then(
		async appConfig => {
			return await startServer(appConfig);
		}
	)
	.then(
		server => { logServerStart(server); }
	)
	.catch(error => {
		const logger = getLogger("readConfiguration");
		logger.error("things seem to have taken a bad turn: %o", error);
	});
