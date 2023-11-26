import { type SessionData } from "express-session";
import _ from "lodash";
import { type Privilege, privilegesByRoles } from "./authorization/privileges/roles-privileges.js";

declare module "express-session" {
	export interface SessionData {
		codeVerifier: string
		authentication: AuthenticatedUser
	}
}

export const createAuthenticatedUser = async (username: string, roles: string[]): Promise<AuthenticatedUser> => {
	const privileges: Privilege[] = roles.reduce<Privilege[]>(
		(acc, role) => {
			if (!_.isNil(privilegesByRoles[role])) {
				acc.push(...privilegesByRoles[role]);
			}
			return acc;
		},
		[]
	);
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

export const storeAuthentication = (session: SessionData, authentication: AuthenticatedUser): void => {
	session.authentication = authentication;
};

export const getAuthentication: (session: any) => AuthenticatedUser =
session => session.authentication;
