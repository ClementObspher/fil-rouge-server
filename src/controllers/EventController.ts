import { Context } from "hono"
import { EventService } from "../services/EventService"
import { UserService } from "../services/UserService"
import { Address, Event } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { Prisma } from "@prisma/client"
import { AddressService } from "../services/AddressService"
import { EventType } from "../enums/EventType"

const eventService = new EventService()
const userService = new UserService()
const addressService = new AddressService()

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
			const userId = c.get("user").userId
			const events = await eventService.findByUserId(userId)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getByTypes(c: Context) {
		try {
			const typesParam = c.req.query("types")

			if (!typesParam) {
				return c.json({ error: "Le paramètre 'types' est requis" }, 400)
			}

			// Parser les types depuis le query parameter (ex: ?types=SPORT,MUSIC)
			const types = typesParam.split(",") as EventType[]
			const events = await eventService.findByTypes(types)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getByParticipantId(c: Context) {
		try {
			const userId = c.get("user").userId
			const events = await eventService.findByParticipantId(userId)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<Event, "id" | "createdAt" | "updatedAt"> & { address: Omit<Address, "id" | "createdAt" | "updatedAt"> }>()
			const address = await addressService.create(data.address)

			const { address: _, ...eventData } = data
			const event = await eventService.create({ ...eventData, addressId: address.id })

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
			const userId = c.get("user").userId

			// Vérifier que l'événement existe
			const existingEvent = (await eventService.findById(id)) as any
			if (!existingEvent) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			// Vérifier que l'utilisateur existe
			const existingUser = await userService.findById(userId)
			if (!existingUser) {
				return c.json({ error: "Utilisateur non trouvé" }, 404)
			}

			// Vérifier si l'utilisateur participe déjà
			const isAlreadyParticipating = existingEvent.participants?.some((participant: any) => participant.id === userId)
			if (isAlreadyParticipating) {
				return c.json({ error: "Vous participez déjà à cet événement" }, 400)
			}

			const event = await eventService.update(id, { participants: { connect: { id: userId } } })
			return c.json(event)
		} catch (error) {
			return c.json({ error: "Erreur lors de la participation à l'événement" }, 500)
		}
	}

	async unParticipate(c: Context) {
		try {
			const id = c.req.param("id")
			const userId = c.get("user").userId

			// Vérifier que l'événement existe
			const existingEvent = (await eventService.findById(id)) as any
			if (!existingEvent) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			// Vérifier que l'utilisateur existe
			const existingUser = await userService.findById(userId)
			if (!existingUser) {
				return c.json({ error: "Utilisateur non trouvé" }, 404)
			}

			// Vérifier si l'utilisateur participe actuellement
			const isParticipating = existingEvent.participants?.some((participant: any) => participant.id === userId)
			if (!isParticipating) {
				return c.json({ error: "Vous ne participez pas à cet événement" }, 400)
			}

			const event = await eventService.update(id, { participants: { disconnect: { id: userId } } })
			return c.json(event)
		} catch (error) {
			console.log("ERREUR dans unParticipate:", error)
			return c.json({ error: "Erreur lors de la désinscription de l'événement" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Prisma.EventUpdateInput> & { address: Omit<Address, "id" | "createdAt" | "updatedAt"> }>()
			const address = await addressService.create(data.address)
			const { address: _, ...eventData } = data
			const updateData = { ...eventData, addressId: address.id } as Partial<Prisma.EventUpdateInput>
			const event = await eventService.update(id, updateData)

			if (data.coverImage && typeof data.coverImage === "string") {
				const base64Data = data.coverImage.split(",")[1]
				const buffer = Buffer.from(base64Data, "base64")
				const coverImage = await uploadImage(buffer, `${event.id}-cover.jpg`)
				await eventService.update(event.id, { coverImage: coverImage })
			}

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
