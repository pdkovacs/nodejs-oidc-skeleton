const defaults = {
	serverPort: 8080,
	serverHostname: "127.0.0.1",
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
	const tokenIssuer = process.env.NOIDCSKE_TOKEN_ISSUER ?? defaults.oidcTokenIssuer;
	const clientId = process.env.NOIDCSKE_CLIENT_ID ?? defaults.oidcClientId;
	const clientSecret = process.env.NOIDCSKE_CLIENT_SECRET ?? defaults.oidcClientSecret;
	const callbackUrl = process.env.NOIDCSKE_CALLBACK_URL ?? defaults.oidcCallbackUrl;
	const logoutUrl = process.env.NOIDCSKE_LOGOUT_URL ?? defaults.oidcLogoutUrl;
	return {
		...defaults,
		logLevel,
		oidcTokenIssuer: tokenIssuer,
		oidcClientId: clientId,
		oidcClientSecret: clientSecret,
		oidcCallbackUrl: callbackUrl,
		oidcLogoutUrl: logoutUrl
	};
};
