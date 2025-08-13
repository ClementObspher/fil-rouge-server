import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import { authMiddleware } from "../src/middleware/auth"
import { AuthController } from "../src/controllers/AuthController"
import { AuthService } from "../src/services/AuthService"
import { UserService } from "../src/services/UserService"
import { MessageService } from "../src/services/MessageService"
import { MessageController } from "../src/controllers/MessageController"
import { EventService } from "../src/services/EventService"

describe("Routes messages", () => {
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

		const messageService = new MessageService(testPrisma)
		const eventService = new EventService(testPrisma)
		const messageController = new MessageController(messageService, eventService)

		const messageRoute = new Hono()
		messageRoute.get("/", (c) => messageController.getAll(c))
		messageRoute.get("/:id", (c) => messageController.getById(c))
		messageRoute.get("/event/:id", (c) => messageController.getByEventId(c))
		messageRoute.post("/", (c) => messageController.create(c))
		messageRoute.put("/:id", (c) => messageController.update(c))
		messageRoute.delete("/:id", (c) => messageController.delete(c))
		app.route("/api/messages", messageRoute)

		// Créer un utilisateur de test et son token
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

	describe("GET /api/messages", () => {
		it("devrait récupérer tous les messages d'un événement", async () => {
			// Créer quelques messages de test
			await testUtils.createTestEventMessage({
				content: "Premier message",
				userId: testUser.id,
				eventId: testEvent.id,
			})

			await testUtils.createTestEventMessage({
				content: "Deuxième message",
				userId: testUser.id,
				eventId: testEvent.id,
			})

			const res = await app.request(`/api/messages/event/${testEvent.id}`, {
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
			expect(data[0]).toHaveProperty("userId")
			expect(data[0]).toHaveProperty("eventId")
			expect(data[0]).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request(`/api/messages/event/${testEvent.id}`, {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})

		it("devrait retourner une erreur si eventId est manquant", async () => {
			const res = await app.request("/api/messages/event/", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe("POST /api/messages", () => {
		it("devrait créer un nouveau message avec des données valides", async () => {
			const messageData = {
				content: "Nouveau message de test",
				eventId: testEvent.id,
				userId: testUser.id,
			}

			const res = await app.request("/api/messages", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messageData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.content).toBe(messageData.content)
			expect(data.eventId).toBe(messageData.eventId)
			expect(data.userId).toBe(messageData.userId)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait rejeter la création avec un contenu vide", async () => {
			const messageData = {
				content: "",
				eventId: testEvent.id,
				userId: testUser.id,
			}

			const res = await app.request("/api/messages", {
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

		it("devrait rejeter la création avec un eventId invalide", async () => {
			const messageData = {
				content: "Message avec eventId invalide",
				eventId: "00000000-0000-0000-0000-000000000000",
				userId: testUser.id,
			}

			const res = await app.request("/api/messages", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(messageData),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter la création avec des données manquantes", async () => {
			const messageData = {
				content: "Message incomplet",
				userId: testUser.id,
				// eventId manquant
			}

			const res = await app.request("/api/messages", {
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
	})

	describe("PUT /api/messages", () => {
		it("devrait mettre à jour un message existant appartenant à l'utilisateur", async () => {
			// Créer un message à mettre à jour
			const message = await testUtils.createTestEventMessage({
				content: "Message original",
				userId: testUser.id,
				eventId: testEvent.id,
			})

			const updateData = {
				id: message.id,
				content: "Message mis à jour",
				eventId: testEvent.id,
				userId: testUser.id,
			}

			const res = await app.request(`/api/messages/${message.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.content).toBe(updateData.content)
			expect(data.id).toBe(message.id)
		})

		it("devrait rejeter la mise à jour d'un message qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer un message appartenant à l'autre utilisateur
			const message = await testUtils.createTestEventMessage({
				content: "Message d'un autre utilisateur",
				userId: otherUser.id,
				eventId: testEvent.id,
			})

			const updateData = {
				id: message.id,
				content: "Tentative de modification non autorisée",
			}

			const res = await app.request(`/api/messages/${message.id}`, {
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

	describe("DELETE /api/messages", () => {
		it("devrait supprimer un message appartenant à l'utilisateur", async () => {
			// Créer un message à supprimer
			const message = await testUtils.createTestEventMessage({
				content: "Message à supprimer",
				userId: testUser.id,
				eventId: testEvent.id,
			})

			const res = await app.request(`/api/messages/${message.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: message.id }),
			})

			expect(res.status).toBe(200)

			// Vérifier que le message a été supprimé
			const deletedMessage = await testPrisma.message.findUnique({
				where: { id: message.id },
			})
			expect(deletedMessage).toBeNull()
		})

		it("devrait rejeter la suppression d'un message qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer un message appartenant à l'autre utilisateur
			const message = await testUtils.createTestEventMessage({
				content: "Message d'un autre utilisateur",
				userId: otherUser.id,
				eventId: testEvent.id,
			})

			const res = await app.request(`/api/messages/${message.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: message.id }),
			})

			expect(res.status).toBe(403)
		})
	})

	describe("GET /api/messages/:id", () => {
		it("devrait récupérer un message existant", async () => {
			const res = await app.request(`/api/messages/${testMessage.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.id).toBe(testMessage.id)
			expect(data.content).toBe(testMessage.content)
			expect(data.userId).toBe(testMessage.userId)
		})

		it("devrait rejeter la récupération d'un message qui n'existe pas", async () => {
			const res = await app.request(`/api/messages/00000000-0000-0000-0000-000000000000`, {
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
})
