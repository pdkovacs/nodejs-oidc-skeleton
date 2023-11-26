import type * as express from "express";
import { Privilege } from "./roles-privileges.js";
import _ from "lodash";
import { getAuthentication } from "../../authenticated-user.js";

type PathSelector = string;
type RoleName = string;
type RequiredPrivileges = Readonly<Record<RoleName, Privilege[]>>;

type RequiredPrivilegesByEndPoints = Readonly<Record<PathSelector, RequiredPrivileges>>;
type EndPoint2RegExpMap = Readonly<Record<string, RegExp>>;

type RequiredPrivilegesGetter = (url: string, requestMethod: string) => Promise<Privilege[]>;

const requiredPrivilegesByEndPoints: RequiredPrivilegesByEndPoints = Object.freeze({
	"^/hello([?].*)?$": {
		POST: [
			Privilege.SAY_HELLO
		]
	},
	"^/hello/other$": {
		POST: [
			Privilege.SAY_HELLO,
			Privilege.SAY_HELLO_TO_USER
		]
	}
});

export const createPrivEndPointToRegExpMap = (endPointPrivDesc: RequiredPrivilegesByEndPoints): EndPoint2RegExpMap => Object.keys(endPointPrivDesc).reduce(
	(acc, key) => Object.assign(acc, { [key]: new RegExp(key) }),
	{}
);

const endPoint2RegExpMap: EndPoint2RegExpMap = createPrivEndPointToRegExpMap(requiredPrivilegesByEndPoints);

export const getRequiredPrivilegesProvider = (epPrivDesc: RequiredPrivilegesByEndPoints, ep2REMap: EndPoint2RegExpMap): RequiredPrivilegesGetter =>
	async (url, requestMethod) =>
		Object.keys(epPrivDesc)
			.filter(route => ep2REMap[route].test(url))
			.flatMap(
				route => Object.keys(epPrivDesc[route])
					.filter(privMethod => requestMethod === privMethod)
					.flatMap(privMethod => epPrivDesc[route][privMethod])
			);

const getRequiredPrivileges = getRequiredPrivilegesProvider(requiredPrivilegesByEndPoints, endPoint2RegExpMap);

export const hasRequiredPrivileges = async (req: express.Request): Promise<boolean> => {
	const requiredPrivileges: string[] = await getRequiredPrivileges(req.url, req.method);
	if (requiredPrivileges.length === 0) {
		return true;
	}
	const authentication = getAuthentication(req.session);
	return !_.isNil(authentication) &&
    _.intersection(requiredPrivileges, authentication.privileges).length >= requiredPrivileges.length;
};
