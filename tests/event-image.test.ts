import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import eventImage from "../src/routes/event_image"
import { authMiddleware } from "../src/middleware/auth"
import { uploadSingle } from "../src/middleware/upload"
import { AuthService } from "../src/services/AuthService"
import { AuthController } from "../src/controllers/AuthController"
import { UserService } from "../src/services/UserService"
import { EventImageService } from "../src/services/EventImageService"
import { EventImageController } from "../src/controllers/EventImageController"
import { EventService } from "../src/services/EventService"
import { Client } from "minio"
import { testConfig } from "./config"

describe("Routes images d'événements", () => {
	let app: Hono
	let testUser: any
	let testEvent: any
	let authToken: string

	beforeEach(async () => {
		app = new Hono()

		const minioClient = new Client({
			endPoint: testConfig.minio.endpoint,
			port: testConfig.minio.port,
			accessKey: testConfig.minio.accessKey,
			secretKey: testConfig.minio.secretKey,
		})

		const authService = new AuthService(testPrisma)
		const userService = new UserService(testPrisma)
		const authController = new AuthController(authService, userService)

		const authRoute = new Hono()
		authRoute.post("/login", (c) => authController.login(c))
		authRoute.post("/register", (c) => authController.register(c))

		app.route("/api/auth", authRoute)
		app.use("/api/*", authMiddleware)

		const eventImageService = new EventImageService(testPrisma)
		const eventService = new EventService(testPrisma)
		const eventImageController = new EventImageController(eventImageService, eventService, minioClient)

		const eventImageRoute = new Hono()
		eventImageRoute.get("/:id", (c) => eventImageController.getById(c))
		eventImageRoute.post("/", uploadSingle("image"), (c) => eventImageController.create(c))
		eventImageRoute.put("/:id", uploadSingle("image"), (c) => eventImageController.update(c))
		eventImageRoute.delete("/:id", (c) => eventImageController.delete(c))
		app.route("/api/event-images", eventImageRoute)

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

	describe("GET /api/event-images", () => {
		it("devrait récupérer toutes les images d'un événement", async () => {
			// Créer quelques images de test
			await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image1.jpg",
				},
			})

			await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image2.jpg",
				},
			})

			const res = await app.request(`/api/event-images/${testEvent.id}`, {
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
			expect(data[0]).toHaveProperty("eventId")
			expect(data[0]).toHaveProperty("url")
			expect(data[0]).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request(`/api/event-images/${testEvent.id}`, {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})

		it("devrait retourner une erreur si eventId est manquant", async () => {
			const res = await app.request("/api/event-images", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe("POST /api/event-images", () => {
		it("devrait uploader une nouvelle image pour un événement", async () => {
			const formData = new FormData()
			formData.append("eventId", testEvent.id)
			formData.append("image", new Blob([Buffer.from("test")]), "test.jpg")

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.eventId).toBe(testEvent.id)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("createdAt")
		})

		it("devrait rejeter l'upload avec un eventId invalide", async () => {
			const formData = new FormData()
			formData.append("eventId", "00000000-0000-0000-0000-000000000000")
			formData.append("image", new Blob([Buffer.from("test")]), "test.jpg")

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'upload avec une URL invalide", async () => {
			const imageData = {
				eventId: testEvent.id,
				url: "invalid-url",
			}

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(imageData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'upload sans fichier", async () => {
			const formData = new FormData()
			formData.append("eventId", testEvent.id)
			// Pas de fichier ajouté

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'upload sans eventId", async () => {
			const formData = new FormData()
			formData.append("image", new Blob([Buffer.from("test")]), "test.jpg")
			// Pas d'eventId ajouté

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'upload pour un événement qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer un événement appartenant à l'autre utilisateur
			const otherEvent = await testUtils.createTestEvent({
				title: "Événement d'un autre utilisateur",
				description: "Description",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: otherUser.id,
				type: "MUSIC",
			})

			const formData = new FormData()
			formData.append("image", new Blob([Buffer.from("test")]), "test.jpg")
			formData.append("eventId", otherEvent.id)

			const res = await app.request("/api/event-images", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(403)
		})
	})

	describe("PUT /api/event-images", () => {
		it("devrait mettre à jour une image existante", async () => {
			// Créer une image à mettre à jour
			const image = await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/old-image.jpg",
				},
			})

			const formData = new FormData()
			formData.append("image", new Blob([Buffer.from("new-test")]), "new-test.jpg")

			const res = await app.request(`/api/event-images/${image.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.id).toBe(image.id)
			expect(data.url).not.toBe("https://example.com/old-image.jpg")
		})

		it("devrait rejeter la mise à jour sans fichier", async () => {
			const image = await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image.jpg",
				},
			})

			const formData = new FormData()
			// Pas de fichier ajouté

			const res = await app.request(`/api/event-images/${image.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("DELETE /api/event-images", () => {
		it("devrait supprimer une image", async () => {
			// Créer une image à supprimer
			const image = await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image-to-delete.jpg",
				},
			})

			const res = await app.request(`/api/event-images/${image.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)

			// Vérifier que l'image a été supprimée
			const deletedImage = await testPrisma.eventImage.findUnique({
				where: { id: image.id },
			})
			expect(deletedImage).toBeNull()
		})

		it("devrait retourner une erreur pour un ID invalide", async () => {
			const res = await app.request("/api/event-images/invalid-id", {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(500)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("PUT /api/event-images/:id", () => {
		it("devrait mettre à jour une image existante", async () => {
			const image = await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image.jpg",
				},
			})

			const formData = new FormData()
			formData.append("image", new Blob([Buffer.from("new-test")]), "new-test.jpg")

			const res = await app.request(`/api/event-images/${image.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.id).toBe(image.id)
			expect(data.url).not.toBe("https://example.com/image.jpg")
		})
	})

	describe("DELETE /api/event-images/:id", () => {
		it("devrait supprimer une image", async () => {
			const image = await testPrisma.eventImage.create({
				data: {
					eventId: testEvent.id,
					url: "https://example.com/image-to-delete.jpg",
				},
			})

			const res = await app.request(`/api/event-images/${image.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)

			// Vérifier que l'image a été supprimée
			const deletedImage = await testPrisma.eventImage.findUnique({
				where: { id: image.id },
			})
			expect(deletedImage).toBeNull()
		})
	})
})
