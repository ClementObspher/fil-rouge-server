import { Context } from "hono"
import { ConversationService } from "../services/ConversationService"
import { UserService } from "../services/UserService"
import { Conversation, User } from "@prisma/client"
import { PrivateMessageService } from "../services/PrivateMessageService"

export class ConversationController {
	private conversationService: ConversationService
	private userService: UserService
	private privateMessageService: PrivateMessageService

	constructor(conversationService?: ConversationService, userService?: UserService, privateMessageService?: PrivateMessageService) {
		this.conversationService = conversationService || new ConversationService()
		this.userService = userService || new UserService()
		this.privateMessageService = privateMessageService || new PrivateMessageService()
	}

	async getConversationsByUserIds(c: Context) {
		try {
			const userId = c.get("user").userId
			const friendId = c.req.query("friendId")
			if (!friendId) {
				return c.json({ error: "friendId is required" }, 400)
			}
			const conversation = await this.conversationService.getConversationsByUserIds([userId, friendId])
			return c.json(conversation)
		} catch (error) {
			return c.json({ error: error }, 500)
		}
	}

	async getConversationById(c: Context) {
		try {
			const id = c.req.param("id")
			const conversation = await this.conversationService.getConversationById(id)
			return c.json(conversation)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async getMessagesByConversationId(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const conversation = (await this.conversationService.getConversationById(id)) as Conversation & { participants: User[] }
			if (!conversation) {
				return c.json({ error: "conversation not found" }, 404)
			}
			if (!conversation.participants.some((participant) => participant.id === userId)) {
				return c.json({ error: "user is not a participant of the conversation" }, 403)
			}
			const messages = await this.conversationService.getMessagesByConversationId(id)
			return c.json(messages)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async createConversation(c: Context) {
		try {
			const userId = c.get("user").userId
			const friendId = c.req.query("friendId")
			if (!friendId) {
				return c.json({ error: "friendId is required" }, 400)
			}
			const friend = await this.userService.findById(friendId)
			if (!friend) {
				return c.json({ error: "friend not found" }, 404)
			}
			const conversation = await this.conversationService.createConversation([userId, friendId])
			return c.json(conversation, 201)
		} catch (error) {
			return c.json({ error: error }, 500)
		}
	}

	async pushMessage(c: Context) {
		try {
			const userId = c.get("user").userId
			const conversationId = c.req.param("id")
			const { message } = await c.req.json<{ message: string }>()
			if (!conversationId || !message) {
				return c.json({ error: "conversationId and message are required" }, 400)
			}
			const conversation = (await this.conversationService.getConversationById(conversationId)) as Conversation & { participants: User[] }
			if (!conversation) {
				return c.json({ error: "conversation not found" }, 404)
			}
			if (!conversation.participants.some((participant) => participant.id === userId)) {
				return c.json({ error: "user is not a participant of the conversation" }, 403)
			}
			const privateMessage = await this.conversationService.pushMessage(conversationId, userId, message)
			return c.json(privateMessage, 201)
		} catch (error) {
			console.error(error)
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async updateMessage(c: Context) {
		try {
			const userId = c.get("user").userId
			const messageId = c.req.param("messageId")
			const { content } = await c.req.json<{ content: string }>()
			if (!messageId || !content) {
				return c.json({ error: "conversationId, messageId and content are required" }, 400)
			}
			const privateMessage = await this.privateMessageService.findById(messageId)
			if (!privateMessage) {
				return c.json({ error: "message not found" }, 404)
			}
			if (privateMessage.senderId !== userId) {
				return c.json({ error: "user is not the sender of the message" }, 403)
			}
			const updatedMessage = await this.privateMessageService.update(messageId, { content })
			return c.json(updatedMessage)
		} catch (error) {
			console.error(error)
			return c.json({ error: "Internal server error" }, 500)
		}
	}
}
