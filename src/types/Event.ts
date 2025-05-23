import { EventImage } from "./EventImage"
import { EventStatus } from "../enums/EventStatus"
import { EventType } from "../enums/EventType"
import { User } from "./User"
import { Message } from "./Message"

export type Event = {
	id: string
	slug: string
	isPublic: boolean
	isFeatured: boolean
	title: string
	description: string
	startDate: Date
	endDate: Date
	longitude: number
	latitude: number
	status: EventStatus
	type: EventType
	userId: string
	user: User
	coverImage: string
	images: EventImage[]
	messages: Message[]
	createdAt: Date
	updatedAt: Date
}
