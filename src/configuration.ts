const defaults = {
	serverPort: 8080,
	serverHostname: "127.0.0.1",
	logLevel: "debug",
	oidcTokenIssuer: "http://keycloak:8080/realms/my-realm",
	oidcClientSecret: "xxxxx",
	oidcCallbackUrl: "http://127.0.0.1:8080/oidc-callback",
	oidcLogoutUrl: "http://keycloak:8080/realms/my-realm/protocol/openid-connect/logout"
};

export type AppConfig = typeof defaults;

export const readConfiguration = async (): Promise<AppConfig> => {
	const clientSecret = process.env.NOIDCSKE_CLIENT_SECRET ?? defaults.oidcClientSecret;
	return {
		...defaults,
		oidcClientSecret: clientSecret
	};
};
