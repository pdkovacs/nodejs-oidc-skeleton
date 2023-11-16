export enum Privilege {
	SAY_HELLO = "SAY_HELLO",
	SAY_HELLO_TO_USER = "SAY_HELLO_TO_USER"
};

export const privilegesByRoles: Record<string, Privilege[]> = {
	USERS: [
		Privilege.SAY_HELLO
	],
	PRIVILEGED_USERS: [
		Privilege.SAY_HELLO,
		Privilege.SAY_HELLO_TO_USER
	]
};
