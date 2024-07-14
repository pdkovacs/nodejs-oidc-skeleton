import type express from "express";
import { getLogger } from "../../logger.js";
import { isNil } from "lodash-es";
import { type OidcHandler } from "./oidc.js";
import { createAuthenticatedUser, storeAuthentication } from "../authenticated-user.js";
import { type Session } from "express-session";
import pug from "pug";

export const setupCallbackRoute = async (router: express.Router, loginUrl: string, oidcHandler: OidcHandler): Promise<void> => {
	router.get("/oidc-callback", (req, res): void => {
		const logger = getLogger("route:///oidc-callback");
		logger.debug("BEGIN");
		const codeVerifier = req.session?.codeVerifier;
		if (isNil(codeVerifier)) {
			logger.error("Missing code-verifier");
			res.redirect(loginUrl);
			return;
		}
		logger.debug("Getting token-set...");
		oidcHandler.getTokenSet(req, codeVerifier)
			.then(
				async tokenSet => {
					logger.debug("Got some token-set");
					if (isNil(tokenSet.access_token)) {
						logger.debug("no access_token in token-set");
						throw new Error("no access_token in token-set");
					}
					const userInfo = await oidcHandler.getUserInfo(tokenSet.access_token);
					const claims = tokenSet.claims();
					logger.debug("Got user-info and claims: %o", claims);
					return await createAuthenticatedUser(
						(userInfo.preferred_username ?? userInfo.email) as string,
						(userInfo.groups ?? claims["cognito:groups"]) as string[]
					);
				}
			)
			.then(
				authnUser => {
					logger.debug("Got authenitcated-user");
					storeAuthentication(req.session as Session, authnUser);
					res.redirect("/");
				}
			)
			.catch(err => {
				logger.error("error while getting token-set: %o", err);
				const template = pug.compile("span.error error while getting token-set: #{errorMessage}");
				const markup = template({ errorMessage: err.message });
				res.send(markup);
			});
	});
};
