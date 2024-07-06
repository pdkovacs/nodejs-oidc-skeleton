import { type Session } from "express-session";
import _ from "lodash";
import { type Privilege, privilegesByRoles } from "./authorization/privileges/roles-privileges.js";
import { getLogger } from "../logger.js";

declare module "express-session" {
	export interface Session {
		codeVerifier: string
		authentication?: AuthenticatedUser
	}
}

export const createAuthenticatedUser = async (username: string, roles: string[]): Promise<AuthenticatedUser> => {
	const logger = getLogger("createAuthenticatedUser");
	logger.debug("BEGIN");
	const privileges: Privilege[] = roles.reduce<Privilege[]>(
		(acc, role) => {
			if (!_.isNil(privilegesByRoles[role])) {
				acc.push(...privilegesByRoles[role]);
			}
			return acc;
		},
		[]
	);
	logger.debug("creating AuthenticatedUser with username=%s and privileges=%o", username, privileges);
	return new AuthenticatedUser(username, privileges);
};

export class AuthenticatedUser {
	public readonly username: string;
	public readonly privileges: Privilege[];

	constructor (userName: string, privileges: Privilege[]) {
		if (_.isEmpty(userName)) {
			throw new Error(`Invalid username/login: ${userName}`);
		}
		this.username = userName;
		this.privileges = privileges ?? [];
	}
}

export const storeAuthentication = (session: Session, authentication: AuthenticatedUser): void => {
	session.authentication = authentication;
};

export const getAuthentication: (session: Session) => AuthenticatedUser | undefined = session => session.authentication;
