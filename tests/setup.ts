import { beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"
import { testConfig, validateTestEnvironment } from "./config"
import * as bcrypt from "bcrypt"

// Validation de l'environnement de test
validateTestEnvironment()

// Configuration de la base de données de test
const testDatabaseUrl = testConfig.database.url

// Client Prisma pour les tests
export const testPrisma = new PrismaClient({
	datasources: {
		db: {
			url: testDatabaseUrl,
		},
	},
})

// Configuration globale pour les tests
beforeAll(async () => {
	// Configuration de l'environnement de test
	process.env.NODE_ENV = "test"
	process.env.JWT_SECRET = testConfig.jwt.secret
	process.env.MINIO_ENDPOINT = testConfig.minio.endpoint
	process.env.MINIO_PORT = testConfig.minio.port.toString()
	process.env.MINIO_ACCESS_KEY = testConfig.minio.accessKey
	process.env.MINIO_SECRET_KEY = testConfig.minio.secretKey
	process.env.MINIO_BUCKET = testConfig.minio.bucket

	// Initialisation de la base de données de test
	try {
		// Reset de la base de données de test
		execSync("npx prisma migrate reset --force --skip-seed", {
			env: { ...process.env, DATABASE_URL: testDatabaseUrl },
			stdio: "inherit",
		})

		// Génération du client Prisma
		execSync("npx prisma generate", {
			env: { ...process.env, DATABASE_URL: testDatabaseUrl },
			stdio: "inherit",
		})
	} catch (error) {
		console.warn("Erreur lors de l'initialisation de la base de données de test:", error)
	}
})

afterAll(async () => {
	// Nettoyage après tous les tests
	await testPrisma.$disconnect()
})

beforeEach(async () => {
	// Nettoyage de la base de données avant chaque test
	try {
		// Supprimer toutes les données dans l'ordre pour éviter les contraintes de clé étrangère
		await testPrisma.privateMessageReaction.deleteMany()
		await testPrisma.messageReaction.deleteMany()
		await testPrisma.privateMessage.deleteMany()
		await testPrisma.message.deleteMany()
		await testPrisma.conversation.deleteMany()
		await testPrisma.friendRequest.deleteMany()
		await testPrisma.eventImage.deleteMany()
		await testPrisma.event.deleteMany()
		await testPrisma.user.deleteMany()

		// Vérifier que la base de données est bien vide
		const userCount = await testPrisma.user.count()
		const eventCount = await testPrisma.event.count()
		const conversationCount = await testPrisma.conversation.count()

		if (userCount > 0 || eventCount > 0 || conversationCount > 0) {
			console.warn("⚠️ Base de données non complètement nettoyée:", {
				users: userCount,
				events: eventCount,
				conversations: conversationCount,
			})
		}
	} catch (error) {
		console.warn("Erreur lors du nettoyage de la base de données:", error)
	}
})

afterEach(async () => {
	// Nettoyage après chaque test
	// Les données sont déjà nettoyées dans beforeEach
})

// Utilitaires pour les tests
export const testUtils = {
	// Créer un utilisateur de test
	async createTestUser(data: { email?: string; password: string; firstname: string; lastname: string; bio?: string; birthdate?: Date; nationality?: string }) {
		// Générer un email unique si non fourni
		const uniqueEmail = data.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`

		const user = await testPrisma.user.findUnique({
			where: { email: uniqueEmail },
		})
		if (user) {
			return user
		}
		const hashedPassword = await bcrypt.hash(data.password, 10)
		return await testPrisma.user.create({
			data: {
				email: uniqueEmail,
				password: hashedPassword,
				firstname: data.firstname,
				lastname: data.lastname,
				bio: data.bio,
				birthdate: data.birthdate?.toISOString(),
				nationality: data.nationality,
			},
		})
	},

	async createTestAdmin(data: { email: string; password: string; firstname: string; lastname: string }) {
		const user = await testPrisma.user.findUnique({
			where: { email: data.email },
		})
		if (user) {
			return user
		}
		const hashedPassword = await bcrypt.hash(data.password, 10)
		return await testPrisma.user.create({
			data: {
				email: data.email,
				password: hashedPassword,
				firstname: data.firstname,
				lastname: data.lastname,
				role: "ADMIN",
				avatar: "https://github.com/shadcn.png",
				bio: "Administrateur de la plateforme",
				birthdate: new Date("1990-01-01"),
				nationality: "FR",
			},
		})
	},

	// Créer un événement de test
	async createTestEvent(data: {
		title: string
		description: string
		startDate: Date
		endDate: Date
		ownerId: string
		type?: "MUSIC" | "DANCE" | "THEATRE" | "VISUAL_ART" | "LITERATURE" | "CINEMA" | "SPORTS" | "OTHER"
		status?: "PENDING" | "CONFIRMED" | "CANCELLED"
		slug?: string
	}) {
		return await testPrisma.event.create({
			data: {
				title: data.title,
				description: data.description,
				startDate: data.startDate,
				endDate: data.endDate,
				ownerId: data.ownerId,
				type: data.type || "OTHER",
				status: data.status || "PENDING",
				slug: data.slug || `test-event-${Date.now()}`,
			},
		})
	},

	// Créer une conversation de test
	async createTestConversation(participants: string[]) {
		// Vérifier que tous les participants existent
		for (const participantId of participants) {
			const user = await testPrisma.user.findUnique({
				where: { id: participantId },
			})
			if (!user) {
				throw new Error(`User with id ${participantId} not found`)
			}
		}

		try {
			const conversation = await testPrisma.conversation.create({
				data: {
					participants: {
						connect: participants.map((id) => ({ id })),
					},
				},
				include: {
					participants: {
						select: {
							id: true,
							email: true,
							firstname: true,
							lastname: true,
						},
					},
				},
			})

			return conversation
		} catch (error) {
			console.error("Error in createTestConversation:", error)
			throw error
		}
	},

	// Créer un message privé de test
	async createTestPrivateMessage(data: { content: string; senderId: string; conversationId: string }) {
		return await testPrisma.privateMessage.create({
			data: {
				content: data.content,
				senderId: data.senderId,
				conversationId: data.conversationId,
			},
		})
	},

	// Créer un message d'événement de test
	async createTestEventMessage(data: { content: string; userId: string; eventId: string }) {
		return await testPrisma.message.create({
			data: {
				content: data.content,
				userId: data.userId,
				eventId: data.eventId,
			},
		})
	},

	async createTestPrivateMessageReaction(data: { messageId: string; userId: string; type: "LIKE" | "LOVE" | "DISLIKE" }) {
		const reaction = await testPrisma.privateMessageReaction.create({
			data: {
				messageId: data.messageId,
				userId: data.userId,
				type: data.type,
			},
		})
		return reaction
	},
}
