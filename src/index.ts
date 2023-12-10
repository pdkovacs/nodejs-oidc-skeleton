import "source-map-support/register.js";
import { getLogger, setDefaultLogLevel } from "./logger.js";

import express from "express";

import { type Logger } from "winston";
import { type AddressInfo } from "node:net";
import helmet from "helmet";
import { type AppConfig, readConfiguration } from "./configuration.js";
import { type OidcHandler, createOidcHandler } from "./security/authentication/oidc.js";
import session from "express-session";
import _ from "lodash";
import { hasRequiredPrivileges } from "./security/authorization/privileges/priv-enforcement.js";
import path from "node:path";
import pug from "pug";
import { setupCallbackRoute } from "./security/authentication/oidc-express.js";

const dirname = new URL(".", import.meta.url).pathname;

let logger: Logger;

interface AppServer {
	readonly address: () => AddressInfo
	readonly shutdown: () => Promise<void>
}

const logServerStart = (server: AppServer): void => {
	const host = (server.address()).address;
	const port = (server.address()).port;

	logger.log("info", "The server is listening at http://%s:%s", host, port);
};

const setupPage = (router: express.Router): void => {
	router.get("/favicon.ico", (_, res) => {
		res.sendStatus(201);
	});

	router.get("/", (req, res) => {
		const logger = getLogger("route:///");
		logger.debug("rendering 'unauth'...");
		if (_.isNil(req.session.authentication)) {
			res.render("unauth");
			return;
		}
		logger.debug("rendering 'index'...");
		res.render("index", {
			user: {
				name: req.session.authentication?.username
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
		if (_.isNil(authentication)) {
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
					const template = pug.compileFile(path.join(dirname, "views/includes/authorization-error.pug"));
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
			if (!_.isNil(logoutUrl)) {
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
		const template = pug.compileFile(path.join(dirname, "views/includes/page-content/authorization-tests.pug"));
		const markup = template({
			user:
				{
					name: req.session.authentication?.username
				}
		});
		res.send(markup);
	});

	router.post("/hello", (req, res) => {
		const logger = getLogger("route:///login");
		const name: string = req.query?.name as string;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});

	router.post("/hello/other", (req, res) => {
		const logger = getLogger("route:///hello/other");
		logger.debug("body: %o", req.body);
		const name: string = req.body.buddy;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});
};

const startServer = async (appConfig: AppConfig): Promise<AppServer> => {
	setDefaultLogLevel("debug");
	logger = getLogger("app");

	const app = express();
	app.use(express.static(path.join(dirname, "views/assets")));
	app.set("view engine", "pug");
	app.set("views", path.join(dirname, "views"));

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
			appConfig.serverHostname,
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
		logger.error("things seem to have taken a bad turn: %o", error);
	});
