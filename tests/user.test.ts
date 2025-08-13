import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import user from "../src/routes/user"
import { authMiddleware } from "../src/middleware/auth"
import { uploadSingle } from "../src/middleware/upload"
import { AuthService } from "../src/services/AuthService"
import { UserService } from "../src/services/UserService"
import { AuthController } from "../src/controllers/AuthController"
import { UserController } from "../src/controllers/UserController"
import { Client } from "minio"
import { testConfig } from "./config"

describe("Routes utilisateurs", () => {
	let app: Hono
	let testUser: any
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

		const userController = new UserController(userService, minioClient)

		const userRoute = new Hono()
		userRoute.get("/", (c) => userController.getAll(c))
		userRoute.get("/friends", (c) => userController.getFriends(c))
		userRoute.post("/friends", (c) => userController.addFriend(c))
		userRoute.delete("/friends/:friendId", (c) => userController.removeFriend(c))
		userRoute.post("/friend-requests/send", (c) => userController.sendFriendRequest(c))
		userRoute.post("/friend-requests/accept", (c) => userController.acceptFriendRequest(c))
		userRoute.post("/friend-requests/decline", (c) => userController.declineFriendRequest(c))
		userRoute.post("/friend-requests/cancel", (c) => userController.cancelFriendRequest(c))
		userRoute.get("/friend-requests/received", (c) => userController.getPendingFriendRequests(c))
		userRoute.get("/friend-requests/sent", (c) => userController.getSentFriendRequests(c))
		userRoute.post("/avatar", uploadSingle("avatar"), (c) => userController.updateAvatar(c))
		userRoute.get("/:id", (c) => userController.getById(c))
		userRoute.post("/", (c) => userController.create(c))
		userRoute.put("/", (c) => userController.update(c))
		userRoute.delete("/", (c) => userController.delete(c))
		app.route("/api/users", userRoute)

		// Créer un utilisateur de test et son token
		testUser = await testUtils.createTestUser({
			email: "test@example.com",
			password: "password123",
			firstname: "John",
			lastname: "Doe",
		})

		const loginRes = await app.request("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: testUser.email, password: "password123" }),
		})
		const tokenData = await loginRes.json()
		authToken = tokenData
	})

	describe("GET /api/users", () => {
		it("devrait récupérer tous les utilisateurs avec authentification", async () => {
			// Créer quelques utilisateurs supplémentaires
			await testUtils.createTestUser({
				email: "user2@example.com",
				password: "password123",
				firstname: "Jane",
				lastname: "Smith",
			})

			const res = await app.request("/api/users", {
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
			expect(data[0]).toHaveProperty("email")
		})

		it("devrait rejeter l'accès sans authentification", async () => {
			const res = await app.request("/api/users", {
				method: "GET",
			})

			expect(res.status).toBe(401)
		})
	})

	describe("GET /api/users/:id", () => {
		it("devrait récupérer un utilisateur spécifique par ID", async () => {
			const res = await app.request(`/api/users/${testUser.id}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.id).toBe(testUser.id)
			expect(data.email).toBe(testUser.email)
			expect(data.firstname).toBe(testUser.firstname)
			expect(data.lastname).toBe(testUser.lastname)
			expect(data).not.toHaveProperty("password")
		})

		it("devrait retourner 404 pour un utilisateur inexistant", async () => {
			const fakeId = "00000000-0000-0000-0000-000000000000"
			const res = await app.request(`/api/users/${fakeId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(404)
		})
	})

	describe("POST /api/users", () => {
		it("devrait créer un nouvel utilisateur", async () => {
			const userData = {
				email: "newuser@example.com",
				password: "password123",
				firstname: "New",
				lastname: "User",
				bio: "Un nouvel utilisateur",
			}

			const res = await app.request("/api/users", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(userData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.email).toBe(userData.email)
			expect(data.firstname).toBe(userData.firstname)
			expect(data.lastname).toBe(userData.lastname)
		})
	})

	describe("PUT /api/users", () => {
		it("devrait mettre à jour un utilisateur existant", async () => {
			const updateData = {
				firstname: "Updated",
				lastname: "Name",
				bio: "Bio mise à jour",
			}

			const res = await app.request("/api/users", {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updateData),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.firstname).toBe(updateData.firstname)
			expect(data.lastname).toBe(updateData.lastname)
			expect(data.bio).toBe(updateData.bio)
		})
	})

	describe("DELETE /api/users", () => {
		it("devrait supprimer un utilisateur", async () => {
			const res = await app.request("/api/users", {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)

			// Vérifier que l'utilisateur a été supprimé
			const deletedUser = await testPrisma.user.findUnique({
				where: { id: testUser.id },
			})
			expect(deletedUser).toBeNull()
		})
	})

	describe("GET /api/users/friends", () => {
		it("devrait récupérer la liste des amis", async () => {
			// Créer un ami
			const friend = await testUtils.createTestUser({
				email: "friend@example.com",
				password: "password123",
				firstname: "Friend",
				lastname: "User",
			})

			// Créer une relation d'amitié
			await testPrisma.user.update({
				where: { id: testUser.id },
				data: {
					User_A: {
						connect: { id: friend.id },
					},
				},
			})

			const res = await app.request("/api/users/friends", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
		})
	})

	describe("POST /api/users/friends", () => {
		it("devrait ajouter un ami", async () => {
			const friend = await testUtils.createTestUser({
				email: "friend@example.com",
				password: "password123",
				firstname: "Friend",
				lastname: "User",
			})

			const res = await app.request("/api/users/friends", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ friendId: friend.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("DELETE /api/users/friends/:friendId", () => {
		it("devrait supprimer un ami", async () => {
			const friend = await testUtils.createTestUser({
				email: "friend@example.com",
				password: "password123",
				firstname: "Friend",
				lastname: "User",
			})

			// D'abord ajouter l'ami
			await testPrisma.user.update({
				where: { id: testUser.id },
				data: {
					User_A: {
						connect: { id: friend.id },
					},
				},
			})

			const res = await app.request(`/api/users/friends/${friend.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
		})
	})

	describe("POST /api/users/friend-requests/send", () => {
		it("devrait envoyer une demande d'ami", async () => {
			const targetUser = await testUtils.createTestUser({
				email: "target@example.com",
				password: "password123",
				firstname: "Target",
				lastname: "User",
			})

			const res = await app.request("/api/users/friend-requests/send", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ friendId: targetUser.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("GET /api/users/friend-requests/received", () => {
		it("devrait récupérer les demandes d'ami reçues", async () => {
			const sender = await testUtils.createTestUser({
				email: "sender@example.com",
				password: "password123",
				firstname: "Sender",
				lastname: "User",
			})

			// Créer une demande d'ami
			await testPrisma.friendRequest.create({
				data: {
					senderId: sender.id,
					receiverId: testUser.id,
					status: "PENDING",
				},
			})

			const res = await app.request("/api/users/friend-requests/received", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(Array.isArray(data)).toBe(true)
		})
	})

	describe("POST /api/users/friend-requests/accept", () => {
		it("devrait accepter une demande d'ami", async () => {
			const sender = await testUtils.createTestUser({
				password: "password123",
				firstname: "Sender",
				lastname: "User",
			})

			const friendRequest = await testPrisma.friendRequest.create({
				data: {
					senderId: sender.id,
					receiverId: testUser.id,
					status: "PENDING",
				},
			})

			const res = await app.request("/api/users/friend-requests/accept", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ requestId: friendRequest.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("POST /api/users/friend-requests/decline", () => {
		it("devrait refuser une demande d'ami", async () => {
			const sender = await testUtils.createTestUser({
				password: "password123",
				firstname: "Sender",
				lastname: "User",
			})

			const friendRequest = await testPrisma.friendRequest.create({
				data: {
					senderId: sender.id,
					receiverId: testUser.id,
					status: "PENDING",
				},
			})

			const res = await app.request("/api/users/friend-requests/decline", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ requestId: friendRequest.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("POST /api/users/friend-requests/cancel", () => {
		it("devrait annuler une demande d'ami", async () => {
			const sender = await testUtils.createTestUser({
				password: "password123",
				firstname: "Sender",
				lastname: "User",
			})

			const friendRequest = await testPrisma.friendRequest.create({
				data: {
					senderId: testUser.id,
					receiverId: sender.id,
					status: "PENDING",
				},
			})

			const res = await app.request("/api/users/friend-requests/cancel", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ requestId: friendRequest.id }),
			})

			expect(res.status).toBe(200)
		})
	})

	describe("POST /api/users/avatar", () => {
		it("devrait mettre à jour l'avatar de l'utilisateur", async () => {
			const formData = new FormData()
			formData.append("avatar", new Blob([Buffer.from("test")]), "test.jpg")

			const res = await app.request("/api/users/avatar", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
				body: formData,
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("avatarUrl")
		})
	})
})
