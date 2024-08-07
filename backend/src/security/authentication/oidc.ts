import { type IncomingMessage } from "http";
import { Issuer, type TokenSet, generators } from "openid-client";

import { getLogger } from "../../logger.js";
import { randomBytes } from "crypto";

interface OidcHandlerParams {
	readonly metaDataUrl: string
	readonly clientId: string
	readonly clientSecret: string
	readonly callbackUrl: string
}

export interface OidcHandler {
	readonly getAuthorizationUrl: (req: Express.Request) => string
	readonly getTokenSet: (req: IncomingMessage, codeVerifier: string) => Promise<TokenSet>
	readonly getUserInfo: (accessToken: string) => Promise<any>
	readonly refreshToken: (refreshToken: TokenSet) => Promise<TokenSet>
}

export const createOidcHandler = async (params: OidcHandlerParams): Promise<OidcHandler> => {
	const logger = getLogger("oidc/createOidcHandler");

	const { metaDataUrl, clientId, clientSecret, callbackUrl } = params;

	logger.info("Performing discovery using %s...", metaDataUrl);
	const issuer = await Issuer.discover(metaDataUrl);

	const client = new issuer.Client({
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uris: [callbackUrl],
		response_types: ["code"]
		// id_token_signed_response_alg (default "RS256")
		// token_endpoint_auth_method (default "client_secret_basic")
	}); // => Client

	/**
   * <ol>
   * <li>generates a code-verifier
   * <li>sets it on the request object <code>req</code>
   * <li>uses it to generate th URL
   */
	const getAuthorizationUrl = (req: Express.Request): string => {
		const codeChallenge = generators.codeChallenge(createCodeVerifier(req));

		return client.authorizationUrl({
			scope: "openid email profile",
			resource: callbackUrl,
			code_challenge: codeChallenge,
			code_challenge_method: "S256"
		});
	};

	const getTokenSet = async (req: IncomingMessage, codeVerifier: string): Promise<TokenSet> => {
		const logger = getLogger("oidc/getTokenSet");
		logger.debug("BEGIN");
		const params = client.callbackParams(req);
		logger.debug("received and validated tokens callbackUrl: %o, params: %o, codeVerifier: %o", callbackUrl, params, codeVerifier);
		const tokenSet = await client.callback(callbackUrl, params, { code_verifier: codeVerifier });
		logger.debug("received and validated tokens %o", tokenSet);
		logger.debug("validated ID Token claims %o", tokenSet.claims());
		return tokenSet;
	};

	const getUserInfo = async (accessToken: string): Promise<any> => {
		const logger = getLogger("oidc/getUserInfo");
		const userinfo = await client.userinfo(accessToken);
		logger.debug("userinfo %o", userinfo);
		return userinfo;
	};

	const refreshToken = async (refreshToken: TokenSet): Promise<TokenSet> => {
		const logger = getLogger("oidc/refreshToken");
		const tokenSet = await client.refresh(refreshToken);
		logger.debug("refreshed and validated tokens %o", tokenSet);
		logger.debug("refreshed ID Token claims %o", tokenSet.claims());
		return tokenSet;
	};

	const createCodeVerifier = (req: Express.Request): string => {
		const codeVerifier = randomBytes(64).toString("hex");
		req.session.codeVerifier = codeVerifier;
		return codeVerifier;
	};

	return {
		getAuthorizationUrl,
		getTokenSet,
		getUserInfo,
		refreshToken
	};
};
