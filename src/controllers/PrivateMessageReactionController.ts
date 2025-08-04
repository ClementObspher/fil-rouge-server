import { Context } from "hono"
import { PrivateMessageReactionService } from "../services/PrivateMessageReactionService"
import { PrivateMessageReaction } from "@prisma/client"

const privateMessageReactionService = new PrivateMessageReactionService()

export class PrivateMessageReactionController {
	async getAll(c: Context) {
		try {
			const privateMessageReactions = await privateMessageReactionService.findAll()
			return c.json(privateMessageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const privateMessageReaction = await privateMessageReactionService.findById(id)

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
			const messageId = c.req.param("id")
			const privateMessageReactions = await privateMessageReactionService.findByMessageId(messageId)
			return c.json(privateMessageReactions)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des réactions" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<PrivateMessageReaction, "id" | "createdAt" | "updatedAt">>()
			const privateMessageReaction = await privateMessageReactionService.create(data)
			return c.json(privateMessageReaction, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de la réaction" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<PrivateMessageReaction>>()
			const privateMessageReaction = await privateMessageReactionService.update(id, data)
			return c.json(privateMessageReaction)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de la réaction" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await privateMessageReactionService.delete(id)
			return c.json({ message: "Réaction supprimée avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de la réaction" }, 500)
		}
	}
}
