import { Context } from "hono"
import { ConversationService } from "../services/ConversationService"

const conversationService = new ConversationService()

export class ConversationController {
	async getConversationsByUserIds(c: Context) {
		try {
			const userId = c.get("user").userId
			const friendId = c.req.query("friendId")
			if (!friendId) {
				return c.json({ error: "friendId is required" }, 400)
			}
			const conversation = await conversationService.getConversationsByUserIds([userId, friendId])
			return c.json(conversation)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async getConversationById(c: Context) {
		try {
			const id = c.req.param("id")
			const conversation = await conversationService.getConversationById(id)
			return c.json(conversation)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async getMessagesByConversationId(c: Context) {
		try {
			const id = c.req.param("id")
			const messages = await conversationService.getMessagesByConversationId(id)
			return c.json(messages)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async createConversation(c: Context) {
		try {
			const userId = c.get("user").userId
			const friendId = c.req.query("friendId")
			const conversation = await conversationService.createConversation([userId, friendId])
			return c.json(conversation)
		} catch (error) {
			return c.json({ error: "Internal server error" }, 500)
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
			const privateMessage = await conversationService.pushMessage(conversationId, userId, message)
			return c.json(privateMessage)
		} catch (error) {
			console.error(error)
			return c.json({ error: "Internal server error" }, 500)
		}
	}

	async updateMessage(c: Context) {
		try {
			const messageId = c.req.param("messageId")
			const { content } = await c.req.json<{ content: string }>()
			if (!messageId || !content) {
				return c.json({ error: "conversationId, messageId and content are required" }, 400)
			}
			const privateMessage = await conversationService.updateMessage(messageId, content)
			return c.json(privateMessage)
		} catch (error) {
			console.error(error)
			return c.json({ error: "Internal server error" }, 500)
		}
	}
}
