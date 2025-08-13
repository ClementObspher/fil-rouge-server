import { Context } from "hono"
import { PrivateMessageReactionService } from "../services/PrivateMessageReactionService"
import { Conversation, PrivateMessageReaction, MessageReactionType } from "@prisma/client"
import { PrivateMessageService } from "../services/PrivateMessageService"
import { ConversationService } from "../services/ConversationService"

export class PrivateMessageReactionController {
	private privateMessageReactionService: PrivateMessageReactionService
	private privateMessageService: PrivateMessageService
	private conversationService: ConversationService

	constructor(privateMessageReactionService: PrivateMessageReactionService, privateMessageService: PrivateMessageService, conversationService: ConversationService) {
		this.privateMessageReactionService = privateMessageReactionService
		this.privateMessageService = privateMessageService
		this.conversationService = conversationService
	}

	async getAll(c: Context) {
		try {
			const privateMessageReactions = await this.privateMessageReactionService.findAll()
			return c.json(privateMessageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const privateMessageReaction = await this.privateMessageReactionService.findById(id)

			if (!privateMessageReaction) {
				return c.json({ error: "Réaction non trouvée" }, 404)
			}

			return c.json(privateMessageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération de la réaction" }, 500)
		}
	}

	async getByMessageId(c: Context) {
		try {
			const userId = c.get("user").userId
			const messageId = c.req.param("id")
			const privateMessage = await this.privateMessageService.findById(messageId)
			if (!privateMessage) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			const conversation = (await this.conversationService.getConversationById(privateMessage.conversationId)) as Conversation & {
				participants: {
					id: string
				}[]
			}
			if (!conversation) {
				return c.json({ error: "Conversation non trouvée" }, 404)
			}
			if (!conversation.participants.some((participant) => participant.id === userId)) {
				return c.json({ error: "Vous n'avez pas les permissions pour accéder à cette réaction" }, 403)
			}
			const privateMessageReactions = await this.privateMessageReactionService.findByMessageId(messageId)
			return c.json(privateMessageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<PrivateMessageReaction, "id" | "createdAt" | "updatedAt"> & { type: MessageReactionType }>()
			if (!data.type) {
				return c.json({ error: "Le type de réaction est requis" }, 400)
			}
			if (!Object.values(MessageReactionType).includes(data.type)) {
				return c.json({ error: "Le type de réaction est invalide" }, 400)
			}
			const privateMessage = await this.privateMessageService.findById(data.messageId)
			if (!privateMessage) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			const conversation = (await this.conversationService.getConversationById(privateMessage.conversationId)) as Conversation & {
				participants: {
					id: string
				}[]
			}
			if (!conversation) {
				return c.json({ error: "Conversation non trouvée" }, 404)
			}
			if (!conversation.participants.some((participant) => participant.id === data.userId)) {
				return c.json({ error: "Vous n'avez pas les permissions pour ajouter une réaction à ce message" }, 403)
			}
			const reactions = await this.privateMessageReactionService.findByMessageId(data.messageId)
			if (reactions.some((reaction) => reaction.userId === data.userId && reaction.type === data.type)) {
				return c.json({ error: "Vous avez déjà ajouté cette réaction à ce message" }, 409)
			}
			const privateMessageReaction = await this.privateMessageReactionService.create(data)
			return c.json(privateMessageReaction, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de la réaction" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const data = await c.req.json<Partial<PrivateMessageReaction> & { type: MessageReactionType }>()
			if (!data.type) {
				return c.json({ error: "Le type de réaction est requis" }, 400)
			}
			if (!Object.values(MessageReactionType).includes(data.type)) {
				return c.json({ error: "Le type de réaction est invalide" }, 400)
			}
			const pmr = await this.privateMessageReactionService.findById(id)
			if (!pmr) {
				return c.json({ error: "Réaction non trouvée" }, 404)
			}
			if (pmr.userId !== data.userId) {
				return c.json({ error: "Vous n'avez pas les permissions pour mettre à jour cette réaction" }, 403)
			}
			const privateMessageReaction = await this.privateMessageReactionService.update(id, data)
			return c.json(privateMessageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de la réaction" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const pmr = await this.privateMessageReactionService.findById(id)
			if (!pmr) {
				return c.json({ error: "Réaction non trouvée" }, 404)
			}
			if (pmr.userId !== userId) {
				return c.json({ error: "Vous n'avez pas les permissions pour supprimer cette réaction" }, 403)
			}
			await this.privateMessageReactionService.delete(id)
			return c.json({ message: "Réaction supprimée avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de la réaction" }, 500)
		}
	}
}
