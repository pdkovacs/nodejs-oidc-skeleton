import { isNil } from "lodash-es";

const defaults = {
	serverPort: 8080,
	serverHost: "127.0.0.1",
	logLevel: "debug",
	oidcTokenIssuer: "http://keycloak:8080/realms/my-realm",
	oidcClientId: "node-skeleton",
	oidcClientSecret: "xxxxx",
	oidcCallbackUrl: "http://127.0.0.1:8080/oidc-callback",
	oidcLogoutUrl: "http://keycloak:8080/realms/my-realm/protocol/openid-connect/logout"
};

export type AppConfig = typeof defaults;

export const readConfiguration = async (): Promise<AppConfig> => {
	const logLevel = process.env.NOIDCSKE_LOG_LEVEL ?? defaults.logLevel;
	const serverHost = process.env.NOIDCSKE_SERVER_HOST ?? defaults.serverHost;
	const serverPort = isNil(process.env.NOIDCSKE_SERVER_PORT) || process.env.NOIDCSKE_SERVER_PORT.length === 0
		? defaults.serverPort
		: parseInt(process.env.NOIDCSKE_SERVER_PORT, 10);
	const tokenIssuer = process.env.NOIDCSKE_TOKEN_ISSUER ?? defaults.oidcTokenIssuer;
	const clientId = process.env.NOIDCSKE_CLIENT_ID ?? defaults.oidcClientId;
	const clientSecret = process.env.NOIDCSKE_CLIENT_SECRET ?? defaults.oidcClientSecret;
	const callbackUrl = process.env.NOIDCSKE_CALLBACK_URL ?? defaults.oidcCallbackUrl;
	const logoutUrl = process.env.NOIDCSKE_LOGOUT_URL ?? defaults.oidcLogoutUrl;
	return {
		...defaults,
		logLevel,
		serverHost,
		serverPort,
		oidcTokenIssuer: tokenIssuer,
		oidcClientId: clientId,
		oidcClientSecret: clientSecret,
		oidcCallbackUrl: callbackUrl,
		oidcLogoutUrl: logoutUrl
	};
};
