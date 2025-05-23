import { Context } from "hono"
import { EventService } from "../services/EventService"
import { Event } from "@prisma/client"

const eventService = new EventService()

export class EventController {
	async getAll(c: Context) {
		try {
			const events = await eventService.findAll()
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const event = await eventService.findById(id)

			if (!event) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			return c.json(event)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération de l'événement" }, 500)
		}
	}

	async getByUserId(c: Context) {
		try {
			const userId = c.req.param("id")
			const events = await eventService.findByUserId(userId)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getByParticipantId(c: Context) {
		try {
			const userId = c.req.param("id")
			const events = await eventService.findByParticipantId(userId)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<Event, "id" | "createdAt" | "updatedAt">>()
			const event = await eventService.create(data)
			return c.json(event, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de l'événement" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Event>>()
			const event = await eventService.update(id, data)
			return c.json(event)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'événement" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await eventService.delete(id)
			return c.json({ message: "Événement supprimé avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'événement" }, 500)
		}
	}
}
