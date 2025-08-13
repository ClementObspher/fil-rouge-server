import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testUtils, testPrisma } from "./setup"
import { authMiddleware } from "../src/middleware/auth"
import { ConversationService } from "../src/services/ConversationService"
import { ConversationController } from "../src/controllers/ConversationController"
import { AuthService } from "../src/services/AuthService"
import { AuthController } from "../src/controllers/AuthController"
import { UserService } from "../src/services/UserService"
import { PrivateMessageService } from "../src/services/PrivateMessageService"

describe("Routes conversations", () => {
	let app: Hono
	let testUser: any
	let otherUser: any
	let authToken: string

	beforeEach(async () => {
		app = new Hono()

		// Créer des services avec le client Prisma de test
		const authService = new AuthService(testPrisma)
		const userService = new UserService(testPrisma)
		const authController = new AuthController(authService, userService)

		// Créer une route d'authentification avec le contrôleur injecté
		const authRoute = new Hono()
		authRoute.post("/login", (c) => authController.login(c))
		authRoute.post("/register", (c) => authController.register(c))

		app.route("/api/auth", authRoute)
		app.use("/api/*", authMiddleware)

		// Créer un service de conversation avec le client Prisma de test
		const conversationService = new ConversationService(testPrisma)
		const privateMessageService = new PrivateMessageService(testPrisma)
		const conversationController = new ConversationController(conversationService, userService, privateMessageService)

		// Créer une route de conversation avec le contrôleur injecté
		const conversationRoute = new Hono()
		conversationRoute.get("/", (c) => conversationController.getConversationsByUserIds(c))
		conversationRoute.get("/:id", (c) => conversationController.getConversationById(c))
		conversationRoute.get("/:id/messages", (c) => conversationController.getMessagesByConversationId(c))
		conversationRoute.post("/", (c) => conversationController.createConversation(c))
		conversationRoute.post("/:id/messages", (c) => conversationController.pushMessage(c))
		conversationRoute.put("/messages/:messageId", (c) => conversationController.updateMessage(c))

		app.route("/api/conversations", conversationRoute)

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

	describe("GET /api/conversations", () => {
		it("devrait récupérer toutes les conversations de l'utilisateur", async () => {
			await testUtils.createTestConversation([testUser.id, otherUser.id])

			const res = await app.request("/api/conversations?friendId=" + otherUser.id, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("participants")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request("/api/conversations", {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})
	})

	describe("POST /api/conversations", () => {
		it("devrait créer une nouvelle conversation avec des participants", async () => {
			const res = await app.request("/api/conversations?friendId=" + otherUser.id, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			const responseData = await res.json()
			console.log(responseData)

			expect(res.status).toBe(201)
			const data = responseData
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("participants")
			expect(data).toHaveProperty("createdAt")
			expect(Array.isArray(data.participants)).toBe(true)
			expect(data.participants.length).toBe(2) // L'utilisateur actuel + l'autre utilisateur
		})

		it("devrait rejeter la création sans participants", async () => {
			const res = await app.request("/api/conversations", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter la création avec un participant inexistant", async () => {
			const res = await app.request("/api/conversations?friendId=00000000-0000-0000-0000-000000000000", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("GET /api/conversations/:id/messages", () => {
		it("devrait récupérer les messages d'une conversation", async () => {
			const conversation = await testUtils.createTestConversation([testUser.id, otherUser.id])

			// Créer quelques messages dans la conversation
			await testUtils.createTestPrivateMessage({
				content: "Premier message",
				senderId: testUser.id,
				conversationId: conversation.id,
			})

			await testUtils.createTestPrivateMessage({
				content: "Deuxième message",
				senderId: otherUser.id,
				conversationId: conversation.id,
			})

			const res = await app.request(`/api/conversations/${conversation.id}/messages`, {
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
			expect(data[0]).toHaveProperty("content")
			expect(data[0]).toHaveProperty("senderId")
			expect(data[0]).toHaveProperty("conversationId")
			expect(data[0]).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'accès à une conversation dont l'utilisateur ne fait pas partie", async () => {
			// Créer une conversation sans l'utilisateur actuel
			const thirdUser = await testUtils.createTestUser({
				email: "third@example.com",
				password: "password123",
				firstname: "Third",
				lastname: "User",
				birthdate: new Date(),
				nationality: "French",
				bio: "I am a third user",
			})

			const conversation = await testUtils.createTestConversation([otherUser.id, thirdUser.id])

			const res = await app.request(`/api/conversations/${conversation.id}/messages`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})
			const data = await res.json()
			console.log(data)
			expect(res.status).toBe(403)
		})
	})

	describe("POST /api/conversations/:id/messages", () => {
		it("devrait envoyer un message dans une conversation", async () => {
			// Créer une conversation
			const conversation = await testUtils.createTestConversation([testUser.id, otherUser.id])

			const messageData = {
				message: "Nouveau message dans la conversation",
			}

			const res = await app.request(`/api/conversations/${conversation.id}/messages`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messageData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.content).toBe(messageData.message)
			expect(data.senderId).toBe(testUser.id)
			expect(data.conversationId).toBe(conversation.id)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'envoi d'un message vide", async () => {
			// Créer une conversation
			const conversation = await testUtils.createTestConversation([testUser.id, otherUser.id])

			const messageData = {
				message: "",
			}

			const res = await app.request(`/api/conversations/${conversation.id}/messages`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messageData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'envoi d'un message dans une conversation dont l'utilisateur ne fait pas partie", async () => {
			// Créer une conversation sans l'utilisateur actuel
			const thirdUser = await testUtils.createTestUser({
				email: "third@example.com",
				password: "password123",
				firstname: "Third",
				lastname: "User",
				birthdate: new Date(),
				nationality: "French",
				bio: "I am a third user",
			})

			const conversation = await testUtils.createTestConversation([otherUser.id, thirdUser.id])

			const messageData = {
				message: "Message non autorisé",
			}

			const res = await app.request(`/api/conversations/${conversation.id}/messages`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messageData),
			})

			expect(res.status).toBe(403)
		})
	})

	describe("PUT /api/conversations/messages/:messageId", () => {
		it("devrait mettre à jour un message", async () => {
			const conversation = await testUtils.createTestConversation([testUser.id, otherUser.id])
			const message = await testUtils.createTestPrivateMessage({
				content: "Message à mettre à jour",
				senderId: testUser.id,
				conversationId: conversation.id,
			})

			const res = await app.request(`/api/conversations/messages/${message.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({ content: "Message mis à jour" }),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.content).toBe("Message mis à jour")
		})

		it("devrait rejeter la mise à jour d'un message dont l'utilisateur n'est pas le sender", async () => {
			const thirdUser = await testUtils.createTestUser({
				email: "third@example.com",
				password: "password123",
				firstname: "Third",
				lastname: "User",
				birthdate: new Date(),
				nationality: "French",
				bio: "I am a third user",
			})
			const conversation = await testUtils.createTestConversation([otherUser.id, thirdUser.id])
			const message = await testUtils.createTestPrivateMessage({
				content: "Message à mettre à jour",
				senderId: otherUser.id,
				conversationId: conversation.id,
			})

			const res = await app.request(`/api/conversations/messages/${message.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({ content: "Message mis à jour" }),
			})

			expect(res.status).toBe(403)
		})
	})
})
