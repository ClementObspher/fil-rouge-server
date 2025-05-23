import { Context } from "hono"
import { EventImageService } from "../services/EventImageService"
import { EventImage } from "@prisma/client"
import { uploadImage } from "../lib/minioController"

const eventImageService = new EventImageService()

export class EventImageController {
	async getAll(c: Context) {
		try {
			const eventImages = await eventImageService.findAll()
			return c.json(eventImages)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des images" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const eventImage = await eventImageService.findById(id)

			if (!eventImage) {
				return c.json({ error: "Image non trouvée" }, 404)
			}

			return c.json(eventImage)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération de l'image" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<EventImage, "id" | "createdAt" | "updatedAt">>()
			const file = (c.req as any).file
			if (!file) {
				return c.json({ error: "Aucun fichier n'a été uploadé" }, 400)
			}
			const imageUrl = await uploadImage(file.buffer, file.originalname)
			data.url = imageUrl
			const eventImage = await eventImageService.create(data)
			return c.json(eventImage, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de l'image" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<EventImage>>()
			const file = (c.req as any).file
			if (!file) {
				return c.json({ error: "Aucun fichier n'a été uploadé" }, 400)
			}
			const imageUrl = await uploadImage(file.buffer, file.originalname)
			data.url = imageUrl
			const eventImage = await eventImageService.update(id, data)
			return c.json(eventImage)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'image" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await eventImageService.delete(id)
			return c.json({ message: "Image supprimée avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'image" }, 500)
		}
	}
}
