import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import event from "../src/routes/event"
import { authMiddleware } from "../src/middleware/auth"
import { Client } from "minio"
import { testConfig } from "./config"
import { AuthService } from "../src/services/AuthService"
import { AuthController } from "../src/controllers/AuthController"
import { UserService } from "../src/services/UserService"
import { EventController } from "../src/controllers/EventController"
import { EventService } from "../src/services/EventService"
import { AddressService } from "../src/services/AddressService"

describe("Routes événements", () => {
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
		const addressService = new AddressService(testPrisma)

		const authRoute = new Hono()
		authRoute.post("/login", (c) => authController.login(c))
		authRoute.post("/register", (c) => authController.register(c))

		app.route("/api/auth", authRoute)
		app.use("/api/*", authMiddleware)

		const eventService = new EventService(testPrisma)
		const eventController = new EventController(eventService, userService, addressService, minioClient)

		const eventRoute = new Hono()
		eventRoute.get("/", (c) => eventController.getAll(c))
		eventRoute.get("/types", (c) => eventController.getByTypes(c))
		eventRoute.get("/user", (c) => eventController.getByUserId(c))
		eventRoute.get("/participant", (c) => eventController.getByParticipantId(c))
		eventRoute.get("/:id", (c) => eventController.getById(c))
		eventRoute.post("/", (c) => eventController.create(c))
		eventRoute.put("/:id", (c) => eventController.update(c))
		eventRoute.delete("/:id", (c) => eventController.delete(c))
		app.route("/api/events", eventRoute)

		testUser = await testUtils.createTestUser({
			email: "test@example.com",
			password: "password123",
			firstname: "John",
			lastname: "Doe",
		})

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

	describe("GET /api/events", () => {
		it("devrait récupérer tous les événements", async () => {
			// Créer quelques événements de test
			await testUtils.createTestEvent({
				title: "Événement 1",
				description: "Description événement 1",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: testUser.id,
				type: "MUSIC",
			})

			await testUtils.createTestEvent({
				title: "Événement 2",
				description: "Description événement 2",
				startDate: new Date("2024-12-26T10:00:00Z"),
				endDate: new Date("2024-12-26T18:00:00Z"),
				ownerId: testUser.id,
				type: "DANCE",
			})

			const res = await app.request("/api/events", {
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
			expect(data[0]).toHaveProperty("title")
			expect(data[0]).toHaveProperty("description")
			expect(data[0]).toHaveProperty("startDate")
			expect(data[0]).toHaveProperty("endDate")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request("/api/events", {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})
	})

	describe("POST /api/events", () => {
		it("devrait créer un nouvel événement avec des données valides", async () => {
			const eventData = {
				title: "Nouvel événement",
				description: "Description du nouvel événement",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				type: "MUSIC",
				isPublic: true,
				isFeatured: false,
				address: {
					number: "123",
					street: "Rue de la Paix",
					postal_code: "75000",
					city: "Paris",
					country: "France",
					latitude: 48.8566,
					longitude: 2.3522,
				},
			}

			const res = await app.request("/api/events", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.title).toBe(eventData.title)
			expect(data.description).toBe(eventData.description)
			expect(data.type).toBe(eventData.type)
			expect(data.ownerId).toBe(testUser.id)
			expect(data).toHaveProperty("id")
			expect(data).toHaveProperty("slug")
		})

		it("devrait rejeter la création avec des données manquantes", async () => {
			const eventData = {
				// title, startDate, endDate manquants
			}

			const res = await app.request("/api/events", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter la création avec des dates invalides", async () => {
			const eventData = {
				title: "Événement avec dates invalides",
				description: "Description",
				startDate: new Date("2024-12-25T18:00:00Z"),
				endDate: new Date("2024-12-25T10:00:00Z"), // Date de fin avant date de début
				type: "MUSIC",
				address: {
					number: "123",
					street: "Rue de la Paix",
					postal_code: "75000",
					city: "Paris",
					country: "France",
					latitude: 48.8566,
					longitude: 2.3522,
				},
			}

			const res = await app.request("/api/events", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})
	})

	describe("PUT /api/events", () => {
		it("devrait mettre à jour un événement existant", async () => {
			// Créer un événement à mettre à jour
			const event = await testUtils.createTestEvent({
				title: "Événement original",
				description: "Description originale",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: testUser.id,
				type: "MUSIC",
			})

			const updateData = {
				title: "Événement mis à jour",
				description: "Description mise à jour",
				type: "DANCE",
			}

			const res = await app.request(`/api/events/${event.id}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.title).toBe(updateData.title)
			expect(data.description).toBe(updateData.description)
			expect(data.type).toBe(updateData.type)
		})

		it("devrait rejeter la mise à jour d'un événement qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer un événement appartenant à l'autre utilisateur
			const event = await testUtils.createTestEvent({
				title: "Événement d'un autre utilisateur",
				description: "Description",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: otherUser.id,
				type: "MUSIC",
			})

			const updateData = {
				title: "Tentative de modification non autorisée",
			}

			const res = await app.request(`/api/events/${event.id}`, {
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

	describe("DELETE /api/events", () => {
		it("devrait supprimer un événement appartenant à l'utilisateur", async () => {
			// Créer un événement à supprimer
			const event = await testUtils.createTestEvent({
				title: "Événement à supprimer",
				description: "Description",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: testUser.id,
				type: "MUSIC",
			})

			const res = await app.request(`/api/events/${event.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			})

			expect(res.status).toBe(200)

			// Vérifier que l'événement a été supprimé
			const deletedEvent = await testPrisma.event.findUnique({
				where: { id: event.id },
			})
			expect(deletedEvent).toBeNull()
		})

		it("devrait rejeter la suppression d'un événement qui n'appartient pas à l'utilisateur", async () => {
			// Créer un autre utilisateur
			const otherUser = await testUtils.createTestUser({
				email: "other@example.com",
				password: "password123",
				firstname: "Other",
				lastname: "User",
			})

			// Créer un événement appartenant à l'autre utilisateur
			const event = await testUtils.createTestEvent({
				title: "Événement d'un autre utilisateur",
				description: "Description",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: otherUser.id,
				type: "MUSIC",
			})

			const res = await app.request(`/api/events/${event.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
			})

			expect(res.status).toBe(403)
		})
	})

	describe("Filtrage et recherche d'événements", () => {
		beforeEach(async () => {
			// Créer plusieurs événements avec différents types et statuts
			await testUtils.createTestEvent({
				title: "Concert de rock",
				description: "Un super concert",
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T18:00:00Z"),
				ownerId: testUser.id,
				type: "MUSIC",
				status: "CONFIRMED",
			})

			await testUtils.createTestEvent({
				title: "Cours de danse",
				description: "Apprenez la salsa",
				startDate: new Date("2024-12-26T10:00:00Z"),
				endDate: new Date("2024-12-26T18:00:00Z"),
				ownerId: testUser.id,
				type: "DANCE",
				status: "PENDING",
			})

			await testUtils.createTestEvent({
				title: "Exposition d'art",
				description: "Art contemporain",
				startDate: new Date("2024-12-27T10:00:00Z"),
				endDate: new Date("2024-12-27T18:00:00Z"),
				ownerId: testUser.id,
				type: "VISUAL_ART",
				status: "CONFIRMED",
			})
		})

		it("devrait filtrer les événements par type", async () => {
			const res = await app.request("/api/events/types?types=MUSIC", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
			data.forEach((event: any) => {
				expect(event.type).toBe("MUSIC")
			})
		})
	})

	it("devrait filtrer les événements par user", async () => {
		const res = await app.request("/api/events/user", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(Array.isArray(data)).toBe(true)
		data.forEach((event: any) => {
			expect(event.ownerId).toBe(testUser.id)
		})
	})

	it("devrait filtrer les événements par participation", async () => {
		const res = await app.request("/api/events/participant", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(Array.isArray(data)).toBe(true)
		data.forEach((event: any) => {
			expect(event.participants.some((participant: any) => participant.id === testUser.id)).toBe(true)
		})
	})

	it("devrait retourner un événement par id", async () => {
		const res = await app.request(`/api/events/${testEvent.id}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.id).toBe(testEvent.id)
	})
})
