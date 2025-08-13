import { Context } from "hono"
import { MessageService } from "../services/MessageService"
import { Message } from "@prisma/client"
import { EventService } from "../services/EventService"
import { UserService } from "../services/UserService"

export class MessageController {
	private messageService: MessageService
	private eventService: EventService
	private userService: UserService

	constructor(messageService?: MessageService, eventService?: EventService, userService?: UserService) {
		this.messageService = messageService || new MessageService()
		this.eventService = eventService || new EventService()
		this.userService = userService || new UserService()
	}

	async getAll(c: Context) {
		try {
			const messages = await this.messageService.findAll()
			return c.json(messages)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des messages" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const message = await this.messageService.findById(id)

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
			const messages = await this.messageService.findByEventId(eventId)
			return c.json(messages)
		} catch (error) {
			console.log(error)
			return c.json({ error: "Erreur lors de la récupération des messages" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<Message, "id" | "createdAt" | "updatedAt">>()
			if (!data.content) {
				return c.json({ error: "Le contenu du message est requis" }, 400)
			}
			if (!data.eventId) {
				return c.json({ error: "L'événement est requis" }, 400)
			}
			if (!data.userId) {
				return c.json({ error: "L'utilisateur est requis" }, 400)
			}
			const event = await this.eventService.findById(data.eventId)
			if (!event) {
				return c.json({ error: "L'événement n'existe pas" }, 404)
			}
			const message = await this.messageService.create(data)
			return c.json(message, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création du message" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Message>>()
			const userId = c.get("user").userId
			const m = await this.messageService.findById(id)
			if (!m) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			if (m.userId !== userId) {
				return c.json({ error: "Vous n'êtes pas autorisé à mettre à jour ce message" }, 403)
			}
			if (!data.content) {
				return c.json({ error: "Le contenu du message est requis" }, 400)
			}
			if (!data.eventId) {
				return c.json({ error: "L'événement est requis" }, 400)
			}
			const message = await this.messageService.update(id, data)
			return c.json(message)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour du message" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			const userId = c.get("user").userId
			const m = await this.messageService.findById(id)
			if (!m) {
				return c.json({ error: "Message non trouvé" }, 404)
			}
			if (m.userId !== userId) {
				return c.json({ error: "Vous n'êtes pas autorisé à supprimer ce message" }, 403)
			}
			await this.messageService.delete(id)
			return c.json({ message: "Message supprimé avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression du message" }, 500)
		}
	}
}
