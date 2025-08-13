import { Context } from "hono"
import { MessageReactionService } from "../services/MessageReactionService"
import { MessageReaction, MessageReactionType } from "@prisma/client"
import { MessageService } from "../services/MessageService"

export class MessageReactionController {
	private messageReactionService: MessageReactionService
	private messageService: MessageService

	constructor(messageReactionService?: MessageReactionService, messageService?: MessageService) {
		this.messageReactionService = messageReactionService || new MessageReactionService()
		this.messageService = messageService || new MessageService()
	}

	async getAll(c: Context) {
		try {
			const messageReactions = await this.messageReactionService.findAll()
			return c.json(messageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const messageReaction = await this.messageReactionService.findById(id)

			if (!messageReaction) {
				return c.json({ error: "Réaction non trouvée" }, 404)
			}

			return c.json(messageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération de la réaction" }, 500)
		}
	}

	async getByMessageId(c: Context) {
		try {
			const messageId = c.req.param("id")
			const message = await this.messageService.findById(messageId)
			if (!message) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			const messageReactions = await this.messageReactionService.findByMessageId(messageId)
			return c.json(messageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const userId = c.get("user").userId
			const data = await c.req.json<Omit<MessageReaction, "id" | "createdAt" | "updatedAt">>()
			const type = data.type
			if (!Object.values(MessageReactionType).includes(type)) {
				return c.json({ error: "Type invalide" }, 400)
			}
			const message = await this.messageService.findById(data.messageId)
			if (!message) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			const reactions = await this.messageReactionService.findByMessageId(data.messageId)
			const userReactions = reactions.find((reaction) => reaction.userId === userId)
			if (userReactions && userReactions.type === type) {
				return c.json({ error: "Vous avez déjà réagi à ce message" }, 409)
			}
			data.userId = userId
			const messageReaction = await this.messageReactionService.create(data)
			return c.json(messageReaction, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de la réaction" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const data = await c.req.json<Partial<MessageReaction>>()
			const reaction = await this.messageReactionService.findById(id)
			if (!reaction) {
				return c.json({ error: "Réaction non trouvée" }, 404)
			}
			if (reaction.userId !== userId) {
				return c.json({ error: "Vous n'êtes pas autorisé à mettre à jour cette réaction" }, 403)
			}
			const messageReaction = await this.messageReactionService.update(id, data)
			return c.json(messageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de la réaction" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await this.messageReactionService.delete(id)
			return c.json({ message: "Réaction supprimée avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de la réaction" }, 500)
		}
	}
}
