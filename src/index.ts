import "source-map-support/register.js";
import { getLogger, setDefaultLogLevel } from "./logger.js";

import express from "express";

import { type Logger } from "winston";
import { type AddressInfo } from "node:net";
import helmet from "helmet";
import { type AppConfig, readConfiguration } from "./configuration.js";
import { type OidcHandler, createOidcHandler } from "./security/authentication/oidc.js";
import session, { type SessionData } from "express-session";
import _ from "lodash";
import { createAuthenticatedUser, storeAuthentication } from "./security/authorization/privileges/authenticated-user.js";
import { hasRequiredPrivileges } from "./security/authorization/privileges/priv-enforcement.js";

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

const setupAuthRoutes = (router: express.Router, oidcHandler: OidcHandler): void => {
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

	router.get("/oidc-callback", (req, res): void => {
		const logger = getLogger("route:///oidc-callback");
		const codeVerifier = req.session?.codeVerifier;
		if (_.isNil(codeVerifier)) {
			logger.error("Missing code-verifier");
			res.sendStatus(401);
			return;
		}
		oidcHandler.getTokenSet(req, codeVerifier)
			.then(
				async tokenSet => {
					if (_.isNil(tokenSet.access_token)) {
						throw new Error("no access_token in token-set");
					}
					const userInfo = await oidcHandler.getUserInfo(tokenSet.access_token);
					return await createAuthenticatedUser(userInfo.preferred_username as string, userInfo.groups as string[]);
				}
			)
			.then(
				authnUser => {
					storeAuthentication(req.session as SessionData, authnUser);
					res.sendStatus(200);
				}
			)
			.catch(err => {
				logger.error("error while getting token-set: %o", err);
				res.sendStatus(401);
			});
	});

	router.use((req, res, next) => {
		const authentication = req.session.authentication;
		if (_.isNil(authentication)) {
			res.redirect("/login");
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
					res.sendStatus(403);
				}
			).catch(error => {
				logger.error("error while evaluating authentication information: %o", error);
				res.sendStatus(401);
			});
	});
};

const setupRoutes = (router: express.Router): void => {
	router.post("/hello", (req, res) => {
		const logger = getLogger("route:///login");
		const name: string = req.query?.name as string;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});

	router.post("/user/:username/hello", (req, res) => {
		const logger = getLogger("route:///user/:username/hello");
		const name: string = req.params?.username;
		logger.debug("incoming request: %s", name);
		res.send(`Hello, ${name}`);
	});
};

const startServer = async (appConfig: AppConfig): Promise<AppServer> => {
	setDefaultLogLevel("debug");
	logger = getLogger("app");

	const app = express();

	app.use(session({
		secret: "my-secret", // a secret string used to sign the session ID cookie
		resave: false, // don't save session if unmodified
		saveUninitialized: false // don't create session until something stored,
	}));

	const directives = helmet.contentSecurityPolicy.getDefaultDirectives();
	app.use(helmet({
		contentSecurityPolicy: {
			useDefaults: false,
			directives
		}
	}));
	app.set("trust proxy", true);
	app.use(express.urlencoded({
		extended: true
	}));

	const router: express.Router = express.Router();

	const oidcHandler: OidcHandler = await createOidcHandler({
		clientSecret: appConfig.oidcClientSecret,
		metaDataUrl: appConfig.oidcTokenIssuer,
		callbackUrl: appConfig.oidcCallbackUrl
	});
	setupAuthRoutes(router, oidcHandler);

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
