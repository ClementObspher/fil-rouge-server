import { Context } from "hono"
import { EventService } from "../services/EventService"
import { UserService } from "../services/UserService"
import { Address, Event, EventType } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { Prisma } from "@prisma/client"
import { AddressService } from "../services/AddressService"
import { Client } from "minio"

export class EventController {
	private eventService: EventService
	private userService: UserService
	private addressService: AddressService
	private minioClient: Client

	constructor(eventService?: EventService, userService?: UserService, addressService?: AddressService, minioClient?: Client) {
		this.eventService = eventService || new EventService()
		this.userService = userService || new UserService()
		this.addressService = addressService || new AddressService()
		this.minioClient =
			minioClient ||
			new Client({
				endPoint: process.env.MINIO_ENDPOINT || "localhost",
				port: parseInt(process.env.MINIO_PORT || "9000"),
				accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
				secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
			})
	}

	async getAll(c: Context) {
		try {
			const events = await this.eventService.findAll()
			return c.json(events)
		} catch (error) {
			console.log(error)
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const event = await this.eventService.findById(id)

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
			const events = await this.eventService.findByUserId(userId)
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
			const events = await this.eventService.findByTypes(types)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async getByParticipantId(c: Context) {
		try {
			const userId = c.get("user").userId
			const events = await this.eventService.findByParticipantId(userId)
			return c.json(events)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des événements" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<Event, "id" | "createdAt" | "updatedAt" | "ownerId"> & { address?: Omit<Address, "id" | "createdAt" | "updatedAt"> }>()
			const userId = c.get("user").userId

			// Validation des données requises
			if (!data.title || !data.startDate || !data.endDate) {
				return c.json({ error: "Titre, date de début et date de fin sont requis" }, 400)
			}

			if (data.startDate >= data.endDate) {
				return c.json({ error: "La date de fin doit être postérieure à la date de début" }, 400)
			}

			// Validation du type d'événement
			if (data.type && !Object.values(EventType).includes(data.type)) {
				return c.json({ error: "Type d'événement invalide" }, 400)
			}

			let addressId: string | null = null
			if (data.address) {
				try {
					const address = await this.addressService.create(data.address)
					addressId = address.id
				} catch (error) {
					console.log("Erreur lors de la création de l'adresse:", error)
					return c.json({ error: "Erreur lors de la création de l'adresse" }, 400)
				}
			}

			const { address: _, ...eventData } = data

			// Générer un slug basé sur le titre
			const baseSlug = data.title
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim()

			// Ajouter un timestamp pour assurer l'unicité
			const timestamp = Date.now()
			const slug = `${baseSlug}-${timestamp}`

			// Préparer les données de l'événement avec les valeurs par défaut
			const eventCreateData = {
				...eventData,
				ownerId: userId,
				addressId,
				slug,
				isPublic: eventData.isPublic ?? false,
				isFeatured: eventData.isFeatured ?? false,
				isArchived: eventData.isArchived ?? false,
				isCancelled: eventData.isCancelled ?? false,
				isDraft: eventData.isDraft ?? false,
				isPublished: eventData.isPublished ?? false,
				isUnlisted: eventData.isUnlisted ?? false,
				isPrivate: eventData.isPrivate ?? false,
			}

			let event
			try {
				event = await this.eventService.create(eventCreateData)
			} catch (error) {
				console.log("Erreur lors de la création de l'événement:", error)
				return c.json({ error: "Erreur lors de la création de l'événement" }, 500)
			}

			// Gérer l'upload de l'image de couverture si fournie
			let finalEvent = event
			if (data.coverImage && typeof data.coverImage === "string") {
				try {
					const base64Data = data.coverImage.split(",")[1]
					const buffer = Buffer.from(base64Data, "base64")
					const coverImage = await uploadImage(buffer, `${event.id}-cover.jpg`, this.minioClient)
					try {
						finalEvent = await this.eventService.update(event.id, { coverImage: coverImage })
					} catch (updateError) {
						console.log("Erreur lors de la mise à jour de l'événement avec l'image:", updateError)
					}
				} catch (error) {
					console.log("Erreur lors de l'upload de l'image de couverture:", error)
				}
			}

			return c.json(finalEvent, 201)
		} catch (error) {
			console.log(error)

			// Gestion spécifique des erreurs de validation Prisma
			if (error instanceof Prisma.PrismaClientValidationError) {
				return c.json({ error: "Données invalides" }, 400)
			}

			// Gestion des erreurs de contrainte unique (slug)
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				return c.json({ error: "Un événement avec ce titre existe déjà" }, 400)
			}

			return c.json({ error: "Erreur lors de la création de l'événement" }, 500)
		}
	}

	async participate(c: Context) {
		try {
			const id = c.req.param("id")
			const userId = c.get("user").userId

			// Vérifier que l'événement existe
			const existingEvent = (await this.eventService.findById(id)) as any
			if (!existingEvent) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			// Vérifier que l'utilisateur existe
			const existingUser = await this.userService.findById(userId)
			if (!existingUser) {
				return c.json({ error: "Utilisateur non trouvé" }, 404)
			}

			// Vérifier si l'utilisateur participe déjà
			const isAlreadyParticipating = existingEvent.participants?.some((participant: any) => participant.id === userId)
			if (isAlreadyParticipating) {
				return c.json({ error: "Vous participez déjà à cet événement" }, 400)
			}

			const event = await this.eventService.update(id, { participants: { connect: { id: userId } } })
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
			const existingEvent = (await this.eventService.findById(id)) as any
			if (!existingEvent) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			// Vérifier que l'utilisateur existe
			const existingUser = await this.userService.findById(userId)
			if (!existingUser) {
				return c.json({ error: "Utilisateur non trouvé" }, 404)
			}

			// Vérifier si l'utilisateur participe actuellement
			const isParticipating = existingEvent.participants?.some((participant: any) => participant.id === userId)
			if (!isParticipating) {
				return c.json({ error: "Vous ne participez pas à cet événement" }, 400)
			}

			const event = await this.eventService.update(id, { participants: { disconnect: { id: userId } } })
			return c.json(event)
		} catch (error) {
			console.log("ERREUR dans unParticipate:", error)
			return c.json({ error: "Erreur lors de la désinscription de l'événement" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const data = await c.req.json<Partial<Prisma.EventUpdateInput> & { address?: Omit<Address, "id" | "createdAt" | "updatedAt"> }>()

			const e = await this.eventService.findById(id)
			if (!e) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			if (e.ownerId !== userId) {
				return c.json({ error: "Vous n'êtes pas autorisé à modifier cet événement" }, 403)
			}

			let addressId: string | null = null
			if (data.address) {
				const address = await this.addressService.create(data.address)
				addressId = address.id
			}

			const { address: _, ...eventData } = data
			const updateData = { ...eventData, addressId } as Partial<Prisma.EventUpdateInput>
			const event = await this.eventService.update(id, updateData)

			if (data.coverImage && typeof data.coverImage === "string") {
				const base64Data = data.coverImage.split(",")[1]
				const buffer = Buffer.from(base64Data, "base64")
				const coverImage = await uploadImage(buffer, `${event.id}-cover.jpg`, this.minioClient)
				await this.eventService.update(event.id, { coverImage: coverImage })
			}

			return c.json(event)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'événement" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const userId = c.get("user").userId
			const id = c.req.param("id")
			const e = await this.eventService.findById(id)
			if (!e) {
				return c.json({ error: "Événement non trouvé" }, 404)
			}

			if (e.ownerId !== userId) {
				return c.json({ error: "Vous n'êtes pas autorisé à supprimer cet événement" }, 403)
			}

			await this.eventService.delete(id)
			return c.json({ message: "Événement supprimé avec succès" }, 200)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'événement" }, 500)
		}
	}
}
