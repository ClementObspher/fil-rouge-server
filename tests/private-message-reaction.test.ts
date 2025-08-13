import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import { authMiddleware } from "../src/middleware/auth"
import { AuthService } from "../src/services/AuthService"
import { UserService } from "../src/services/UserService"
import { AuthController } from "../src/controllers/AuthController"
import { PrivateMessageReactionService } from "../src/services/PrivateMessageReactionService"
import { PrivateMessageService } from "../src/services/PrivateMessageService"
import { PrivateMessageReactionController } from "../src/controllers/PrivateMessageReactionController"
import { ConversationService } from "../src/services/ConversationService"

describe("Routes réactions aux messages privés", () => {
	let app: Hono
	let testUser: any
	let otherUser: any
	let testConversation: any
	let testPrivateMessage: any
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

		const privateMessageReactionService = new PrivateMessageReactionService(testPrisma)
		const privateMessageService = new PrivateMessageService(testPrisma)
		const conversationService = new ConversationService(testPrisma)
		const privateMessageReactionController = new PrivateMessageReactionController(privateMessageReactionService, privateMessageService, conversationService)

		const privateMessageReactionRoute = new Hono()
		privateMessageReactionRoute.get("/", (c) => privateMessageReactionController.getAll(c))
		privateMessageReactionRoute.get("/:id", (c) => privateMessageReactionController.getById(c))
		privateMessageReactionRoute.get("/message/:id", (c) => privateMessageReactionController.getByMessageId(c))
		privateMessageReactionRoute.post("/", (c) => privateMessageReactionController.create(c))
		privateMessageReactionRoute.put("/:id", (c) => privateMessageReactionController.update(c))
		privateMessageReactionRoute.delete("/:id", (c) => privateMessageReactionController.delete(c))
		app.route("/api/private-message-reactions", privateMessageReactionRoute)

		// Créer des utilisateurs de test
		testUser = await testUtils.createTestUser({
			email: "test@example.com",
			password: "password123",
			firstname: "John",
			lastname: "Doe",
		})

		otherUser = await testUtils.createTestUser({
			email: "other@example.com",
			password: "password123",
			firstname: "Jane",
			lastname: "Smith",
		})

		// Créer une conversation de test
		testConversation = await testUtils.createTestConversation([testUser.id, otherUser.id])

		// Créer un message privé de test
		testPrivateMessage = await testUtils.createTestPrivateMessage({
			content: "Message privé de test pour les réactions",
			senderId: testUser.id,
			conversationId: testConversation.id,
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

	describe("GET /api/private-message-reactions", () => {
		it("devrait récupérer toutes les réactions d'un message privé", async () => {
			// Créer quelques réactions de test
			await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: otherUser.id,
				type: "LIKE",
			})

			await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: otherUser.id,
				type: "LOVE",
			})

			const res = await app.request(`/api/private-message-reactions/message/${testPrivateMessage.id}`, {
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
			const res = await app.request(`/api/private-message-reactions/message/${testPrivateMessage.id}`, {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})

		it("devrait retourner une erreur si messageId est manquant", async () => {
			const res = await app.request("/api/private-message-reactions/message/", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
		})

		it("devrait rejeter l'accès aux réactions d'un message privé dont l'utilisateur ne fait pas partie", async () => {
			// Créer une conversation sans l'utilisateur actuel
			const thirdUser = await testUtils.createTestUser({
				email: "third@example.com",
				password: "password123",
				firstname: "Third",
				lastname: "User",
			})

			const otherConversation = await testUtils.createTestConversation([otherUser.id, thirdUser.id])

			const otherMessage = await testUtils.createTestPrivateMessage({
				content: "Message d'une autre conversation",
				senderId: otherUser.id,
				conversationId: otherConversation.id,
			})

			const res = await app.request(`/api/private-message-reactions/message/${otherMessage.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(403)
		})
	})

	describe("POST /api/private-message-reactions", () => {
		it("devrait ajouter une réaction LIKE à un message privé", async () => {
			const reactionData = {
				messageId: testPrivateMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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
			expect(data.userId).toBe(reactionData.userId)
			expect(data.type).toBe(reactionData.type)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait ajouter une réaction LOVE à un message privé", async () => {
			const reactionData = {
				messageId: testPrivateMessage.id,
				type: "LOVE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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
			expect(data.userId).toBe(reactionData.userId)
			expect(data.type).toBe(reactionData.type)
		})

		it("devrait ajouter une réaction DISLIKE à un message privé", async () => {
			const reactionData = {
				messageId: testPrivateMessage.id,
				type: "DISLIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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
			expect(data.userId).toBe(reactionData.userId)
			expect(data.type).toBe(reactionData.type)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'ajout d'une réaction avec un type invalide", async () => {
			const reactionData = {
				messageId: testPrivateMessage.id,
				type: "INVALID_TYPE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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

		it("devrait rejeter l'ajout d'une réaction à un message privé inexistant", async () => {
			const reactionData = {
				messageId: "00000000-0000-0000-0000-000000000000",
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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
				messageId: testPrivateMessage.id,
				// type manquant
			}

			const res = await app.request("/api/private-message-reactions", {
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

		it("devrait rejeter l'ajout d'une réaction à un message privé d'une conversation dont l'utilisateur ne fait pas partie", async () => {
			// Créer une conversation sans l'utilisateur actuel
			const thirdUser = await testUtils.createTestUser({
				email: "third@example.com",
				password: "password123",
				firstname: "Third",
				lastname: "User",
			})

			const otherConversation = await testUtils.createTestConversation([otherUser.id, thirdUser.id])

			const otherMessage = await testUtils.createTestPrivateMessage({
				content: "Message d'une autre conversation",
				senderId: otherUser.id,
				conversationId: otherConversation.id,
			})

			const reactionData = {
				messageId: otherMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData),
			})

			expect(res.status).toBe(403)
		})
	})

	describe("PUT /api/private-message-reactions", () => {
		it("devrait mettre à jour une réaction existante", async () => {
			// Créer une réaction à mettre à jour
			const reaction = await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: testUser.id,
				type: "LIKE",
			})

			const updateData = {
				id: reaction.id,
				type: "LOVE",
				userId: testUser.id,
			}

			const res = await app.request(`/api/private-message-reactions/${reaction.id}`, {
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
			// Créer une réaction appartenant à l'autre utilisateur
			const reaction = await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: otherUser.id,
				type: "LIKE",
			})

			const updateData = {
				id: reaction.id,
				type: "LOVE",
				userId: testUser.id,
			}

			const res = await app.request(`/api/private-message-reactions/${reaction.id}`, {
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

	describe("DELETE /api/private-message-reactions", () => {
		it("devrait supprimer une réaction appartenant à l'utilisateur", async () => {
			// Créer une réaction à supprimer
			const reaction = await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: testUser.id,
				type: "LIKE",
			})

			const res = await app.request(`/api/private-message-reactions/${reaction.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			})

			expect(res.status).toBe(200)

			// Vérifier que la réaction a été supprimée
			const deletedReaction = await testPrisma.privateMessageReaction.findUnique({
				where: { id: reaction.id },
			})
			expect(deletedReaction).toBeNull()
		})

		it("devrait rejeter la suppression d'une réaction qui n'appartient pas à l'utilisateur", async () => {
			// Créer une réaction appartenant à l'autre utilisateur
			const reaction = await testUtils.createTestPrivateMessageReaction({
				messageId: testPrivateMessage.id,
				userId: otherUser.id,
				type: "LIKE",
			})

			const res = await app.request(`/api/private-message-reactions/${reaction.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			})

			expect(res.status).toBe(403)
		})
	})

	describe("Gestion des réactions multiples", () => {
		it("devrait empêcher l'ajout de réactions multiples du même type par le même utilisateur", async () => {
			// Ajouter une première réaction LIKE
			const reactionData1 = {
				messageId: testPrivateMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			await app.request("/api/private-message-reactions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(reactionData1),
			})

			// Tenter d'ajouter une deuxième réaction LIKE
			const reactionData2 = {
				messageId: testPrivateMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res = await app.request("/api/private-message-reactions", {
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
				messageId: testPrivateMessage.id,
				type: "LIKE",
				userId: testUser.id,
			}

			const res1 = await app.request("/api/private-message-reactions", {
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
				type: "LOVE",
				userId: testUser.id,
			}

			const res2 = await app.request(`/api/private-message-reactions/${reaction.id}`, {
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
