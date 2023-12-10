import type express from "express";
import { getLogger } from "../../logger.js";
import _ from "lodash";
import { type OidcHandler } from "./oidc.js";
import { createAuthenticatedUser, storeAuthentication } from "../authenticated-user.js";
import { type Session } from "express-session";
import pug from "pug";

export const setupCallbackRoute = async (router: express.Router, loginUrl: string, oidcHandler: OidcHandler): Promise<void> => {
	router.get("/oidc-callback", (req, res): void => {
		const logger = getLogger("route:///oidc-callback");
		const codeVerifier = req.session?.codeVerifier;
		if (_.isNil(codeVerifier)) {
			logger.error("Missing code-verifier");
			res.redirect(loginUrl);
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
