import { Context } from "hono"
import { MessageReactionService } from "../services/MessageReactionService"
import { MessageReaction } from "@prisma/client"

const messageReactionService = new MessageReactionService()

export class MessageReactionController {
	async getAll(c: Context) {
		try {
			const messageReactions = await messageReactionService.findAll()
			return c.json(messageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const messageReaction = await messageReactionService.findById(id)

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
			const messageReactions = await messageReactionService.findByMessageId(messageId)
			return c.json(messageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<MessageReaction, "id" | "createdAt" | "updatedAt">>()
			const messageReaction = await messageReactionService.create(data)
			return c.json(messageReaction, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de la réaction" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<MessageReaction>>()
			const messageReaction = await messageReactionService.update(id, data)
			return c.json(messageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de la réaction" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await messageReactionService.delete(id)
			return c.json({ message: "Réaction supprimée avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de la réaction" }, 500)
		}
	}
}
