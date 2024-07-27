export enum Privilege {
	SAY_HELLO = "SAY_HELLO",
	SAY_HELLO_TO_USER = "SAY_HELLO_TO_USER",
	DO_MEMORY_INCREASE_TEST = "DO_MEMORY_INCREASE_TEST"
};

export const privilegesByRoles: Record<string, Privilege[]> = {
	USERS: [
		Privilege.SAY_HELLO
	],
	PRIVILEGED_USERS: [
		Privilege.SAY_HELLO,
		Privilege.SAY_HELLO_TO_USER,
		Privilege.DO_MEMORY_INCREASE_TEST
	]
};
