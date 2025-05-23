import { User } from "./User"
import { Event } from "./Event"

export type Message = {
	id: string
	content: string
	userId: string // Clé étrangère vers User
	user: User
	eventId: string // Clé étrangère vers Event
	event: Event
	createdAt: Date
	updatedAt: Date
}
