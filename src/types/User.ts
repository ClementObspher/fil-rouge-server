import { Role } from "../enums/Role"

export type User = {
	id: string
	email: string
	password: string
	name: string
	role: Role
	avatar: string
	events: Event[]
}
