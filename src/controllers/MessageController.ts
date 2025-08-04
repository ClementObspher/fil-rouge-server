import { Context } from "hono"
import { MessageService } from "../services/MessageService"
import { Message } from "@prisma/client"

const messageService = new MessageService()

export class MessageController {
	async getAll(c: Context) {
		try {
			const messages = await messageService.findAll()
			return c.json(messages)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des messages" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const message = await messageService.findById(id)

			if (!message) {
				return c.json({ error: "Message non trouvé" }, 404)
			}

			return c.json(message)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération du message" }, 500)
		}
	}

	async getByEventId(c: Context) {
		try {
			const eventId = c.req.param("id")
			const messages = await messageService.findByEventId(eventId)
			return c.json(messages)
		} catch (error) {
			console.log(error)
			return c.json({ error: "Erreur lors de la récupération des messages" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<Message, "id" | "createdAt" | "updatedAt">>()
			const message = await messageService.create(data)
			return c.json(message, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création du message" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Message>>()
			const message = await messageService.update(id, data)
			return c.json(message)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour du message" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await messageService.delete(id)
			return c.json({ message: "Message supprimé avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression du message" }, 500)
		}
	}
}
