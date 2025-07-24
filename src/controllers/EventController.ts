import { Context } from "hono"
import { EventService } from "../services/EventService"
import { Event } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { Prisma } from "@prisma/client"

const eventService = new EventService()

export class EventController {
	async getAll(c: Context) {
		try {
			const events = await eventService.findAll()
			return c.json(events)
		} catch (error) {
			console.log(error)
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

			if (data.coverImage) {
				const base64Data = data.coverImage.split(",")[1]
				const buffer = Buffer.from(base64Data, "base64")
				const coverImage = await uploadImage(buffer, `${event.id}-cover.jpg`)
				await eventService.update(event.id, { coverImage: coverImage })
			}

			return c.json(event, 201)
		} catch (error) {
			console.log(error)
			return c.json({ error: "Erreur lors de la création de l'événement" }, 500)
		}
	}

	async participate(c: Context) {
		try {
			const id = c.req.param("id")
			const userId = c.req.param("userId")
			const event = await eventService.update(id, { participants: { connect: { id: userId } } })
			return c.json(event)
		} catch (error) {
			return c.json({ error: "Erreur lors de la participation à l'événement" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Prisma.EventUpdateInput>>()
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
