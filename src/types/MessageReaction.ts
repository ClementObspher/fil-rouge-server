import { User } from "./User"

export type MessageReaction = {
	id: string
	messageId: string
	userId: string
	user: User
	createdAt: Date
	updatedAt: Date
}
