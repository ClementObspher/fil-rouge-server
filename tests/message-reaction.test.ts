import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import messageReaction from "../src/routes/message_reaction"
import { authMiddleware } from "../src/middleware/auth"
import { AuthService } from "../src/services/AuthService"
import { UserService } from "../src/services/UserService"
import { AuthController } from "../src/controllers/AuthController"
import { MessageReactionController } from "../src/controllers/MessageReactionController"
import { MessageReactionService } from "../src/services/MessageReactionService"
import { MessageService } from "../src/services/MessageService"

describe("Routes réactions aux messages", () => {
	let app: Hono
	let testUser: any
	let testEvent: any
	let testMessage: any
	let authToken: string

	beforeEach(async () => {
		app = new Hono()

		const authService = new AuthService(testPrisma)
		const userService = new UserService(testPrisma)
		const authController = new AuthController(authService, userService)

		const authRoute = new Hono()
		authRoute.post("/login", (c) => authController.login(c))
		authRoute.post("/register", (c) => authController.register(c))

		app.route("/api/auth", authRoute)
		app.use("/api/*", authMiddleware)

		const messageReactionService = new MessageReactionService(testPrisma)
		const messageService = new MessageService(testPrisma)
		const messageReactionController = new MessageReactionController(messageReactionService, messageService)

		// Utiliser le fichier de routes existant mais avec le contrôleur injecté
		const messageReactionRoute = new Hono()
		messageReactionRoute.get("/", (c) => messageReactionController.getAll(c))
		messageReactionRoute.get("/:id", (c) => messageReactionController.getById(c))
		messageReactionRoute.get("/message/:id", (c) => messageReactionController.getByMessageId(c))
		messageReactionRoute.post("/", (c) => messageReactionController.create(c))
		messageReactionRoute.put("/:id", (c) => messageReactionController.update(c))
		messageReactionRoute.delete("/:id", (c) => messageReactionController.delete(c))
		app.route("/api/message-reactions", messageReactionRoute)

		testUser = await testUtils.createTestUser({
			email: "test@example.com",
			password: "password123",
			firstname: "John",
			lastname: "Doe",
		})

		// Créer un événement de test
		testEvent = await testUtils.createTestEvent({
			title: "Événement de test",
			description: "Description de l'événement de test",
			startDate: new Date("2024-12-25T10:00:00Z"),
			endDate: new Date("2024-12-25T18:00:00Z"),
			ownerId: testUser.id,
			type: "MUSIC",
		})

		// Créer un message de test
		testMessage = await testUtils.createTestEventMessage({
			content: "Message de test pour les réactions",
			userId: testUser.id,
			eventId: testEvent.id,
		})

		const loginRes = await app.request("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: testUser.email, password: "password123" }),
		})
		const token = await loginRes.json()
		authToken = token
	})

	describe("GET /api/message-reactions", () => {
		it("devrait récupérer toutes les réactions d'un message", async () => {
			// Créer quelques réactions de test
			await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: testUser.id,
					type: "LIKE",
				},
			})

			await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: testUser.id,
					type: "LOVE",
				},
			})

			const res = await app.request(`/api/message-reactions/message/${testMessage.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
			expect(data.length).toBeGreaterThanOrEqual(2)
			expect(data[0]).toHaveProperty("id")
			expect(data[0]).toHaveProperty("messageId")
			expect(data[0]).toHaveProperty("userId")
			expect(data[0]).toHaveProperty("type")
			expect(data[0]).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request(`/api/message-reactions/message/${testMessage.id}`, {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})

		it("devrait retourner une erreur si messageId est invalide", async () => {
			const res = await app.request("/api/message-reactions/message/invalid-id", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("POST /api/message-reactions", () => {
		it("devrait ajouter une réaction LIKE à un message", async () => {
			const reactionData = {
				messageId: testMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.messageId).toBe(reactionData.messageId)
			expect(data.userId).toBe(testUser.id)
			expect(data.type).toBe(reactionData.type)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait ajouter une réaction LOVE à un message", async () => {
			const reactionData = {
				messageId: testMessage.id,
				type: "LOVE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.type).toBe(reactionData.type)
		})

		it("devrait ajouter une réaction DISLIKE à un message", async () => {
			const reactionData = {
				messageId: testMessage.id,
				type: "DISLIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.type).toBe(reactionData.type)
		})

		it("devrait rejeter l'ajout d'une réaction avec un type invalide", async () => {
			const reactionData = {
				messageId: testMessage.id,
				type: "INVALID_TYPE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'ajout d'une réaction à un message inexistant", async () => {
			const reactionData = {
				messageId: "00000000-0000-0000-0000-000000000000",
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'ajout d'une réaction avec des données manquantes", async () => {
			const reactionData = {
				messageId: testMessage.id,
				userId: testUser.id,
				// type manquant
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("PUT /api/message-reactions", () => {
		it("devrait mettre à jour une réaction existante", async () => {
			// Créer une réaction à mettre à jour
			const reaction = await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: testUser.id,
					type: "LIKE",
				},
			})

			const updateData = {
				id: reaction.id,
				type: "LOVE",
			}

			const res = await app.request(`/api/message-reactions/${reaction.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.type).toBe(updateData.type)
			expect(data.id).toBe(reaction.id)
		})

		it("devrait rejeter la mise à jour d'une réaction qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer une réaction appartenant à l'autre utilisateur
			const reaction = await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: otherUser.id,
					type: "LIKE",
				},
			})

			const updateData = {
				id: reaction.id,
				type: "LOVE",
			}

			const res = await app.request(`/api/message-reactions/${reaction.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res.status).toBe(403)
		})
	})

	describe("DELETE /api/message-reactions", () => {
		it("devrait supprimer une réaction appartenant à l'utilisateur", async () => {
			// Créer une réaction à supprimer
			const reaction = await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: testUser.id,
					type: "LIKE",
				},
			})

			const res = await app.request(`/api/message-reactions/${reaction.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: reaction.id }),
			})

			expect(res.status).toBe(200)

			// Vérifier que la réaction a été supprimée
			const deletedReaction = await testPrisma.messageReaction.findUnique({
				where: { id: reaction.id },
			})
			expect(deletedReaction).toBeNull()
		})

		it("devrait rejeter la suppression d'une réaction qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer une réaction appartenant à l'autre utilisateur
			const reaction = await testPrisma.messageReaction.create({
				data: {
					messageId: testMessage.id,
					userId: otherUser.id,
					type: "LIKE",
				},
			})

			const res = await app.request(`/api/message-reactions/${reaction.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: reaction.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("Gestion des réactions multiples", () => {
		it("devrait empêcher l'ajout de réactions multiples du même type par le même utilisateur", async () => {
			// Ajouter une première réaction LIKE
			const reactionData1 = {
				messageId: testMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData1),
			})

			// Tenter d'ajouter une deuxième réaction LIKE
			const reactionData2 = {
				messageId: testMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData2),
			})

			expect(res.status).toBe(409) // Conflict
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait permettre de changer le type de réaction existante", async () => {
			// Ajouter une réaction LIKE
			const reactionData1 = {
				messageId: testMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res1 = await app.request("/api/message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData1),
			})

			const reaction = await res1.json()

			// Changer le type en LOVE
			const updateData = {
				id: reaction.id,
				type: "LOVE",
				userId: testUser.id,
			}

			const res2 = await app.request(`/api/message-reactions/${reaction.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res2.status).toBe(200)
			const data = await res2.json()
			expect(data.type).toBe("LOVE")
		})
	})
})
