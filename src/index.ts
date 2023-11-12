import "source-map-support/register.js";
import { getLogger, setDefaultLogLevel } from "./logger.js";

import express from "express";

import { type Logger } from "winston";
import { type AddressInfo } from "node:net";
import helmet from "helmet";
import { type AppConfig, readConfiguration } from "./configuration.js";
import { type OidcHandler, createOidcHandler } from "./security/authentication/oidc.js";
import { randomBytes } from "node:crypto";
import session from "express-session";
import _ from "lodash";

declare module "express-session" {
	export interface SessionData {
		codeVerifier: string
	}
}

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
		const logger = getLogger("route/login");
		const name: string = req.query?.name as string;
		logger.debug("incoming request: %s", name);
		const codeVerifier = randomBytes(64).toString("hex");
		req.session.codeVerifier = codeVerifier;
		const auhtrZUrl = oidcHandler.getAuthorizationUrl(codeVerifier);
		res.redirect(auhtrZUrl);
	});

	router.get("/oidc-callback", (req, res): void => {
		const logger = getLogger("route/oidc-callback");
		const codeVerifier = req.session?.codeVerifier;
		if (_.isNil(codeVerifier)) {
			logger.error("Missing code-verifier");
			res.sendStatus(401);
			return;
		}
		oidcHandler.getTokenSet(req, codeVerifier)
			.catch(err => {
				logger.error("error while getting token-set: %o", err);
				res.sendStatus(401);
			});
	});
};

const setupRoutes = (router: express.Router): void => {
	router.get("/hello", (req, res) => {
		const logger = getLogger("route/login");
		const name: string = req.query?.name as string;
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
		saveUninitialized: false // don't create session until something stored
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
