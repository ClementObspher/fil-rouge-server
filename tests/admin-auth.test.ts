import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testUtils } from "./setup"
import adminAuth from "../src/routes/adminAuth"
describe("Routes authentification admin", () => {
	let app: Hono

	beforeEach(async () => {
		app = new Hono()
		app.route("/admin", adminAuth)
	})

	describe("POST /admin/login", () => {
		it("devrait connecter un administrateur avec des identifiants valides", async () => {
			// Créer un utilisateur admin
			await testUtils.createTestAdmin({
				email: "admin1@example.com",
				password: "password",
				firstname: "Admin",
				lastname: "User",
			})

			const loginData = {
				email: "admin1@example.com",
				password: "password",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveProperty("user")
			expect(data.data).toHaveProperty("token")
			expect(data.data.user.email).toBe(loginData.email)
			expect(data.data.user.role).toBe("ADMIN")
		})

		it("devrait rejeter la connexion d'un utilisateur non-admin", async () => {
			// Créer un utilisateur normal
			await testUtils.createTestUser({
				email: "user1@example.com",
				password: "user123",
				firstname: "Normal",
				lastname: "User",
			})

			const loginData = {
				email: "user1@example.com",
				password: "user123",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data).toHaveProperty("message")
			expect(data.message).toContain("Accès réservé aux administrateurs")
		})

		it("devrait rejeter la connexion avec un email inexistant", async () => {
			const loginData = {
				email: "nonexistent@example.com",
				password: "password",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data).toHaveProperty("message")
			expect(data.message).toContain("Identifiants incorrects")
		})

		it("devrait rejeter la connexion avec un mot de passe incorrect", async () => {
			// Créer un utilisateur admin
			const adminUser = await testUtils.createTestAdmin({
				email: "admin2@example.com",
				password: "correctpassword",
				firstname: "Admin",
				lastname: "User",
			})

			const loginData = {
				email: "admin2@example.com",
				password: "wrongpassword",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data).toHaveProperty("message")
			expect(data.message).toContain("Identifiants incorrects")
		})

		it("devrait rejeter la connexion sans email", async () => {
			const loginData = {
				password: "password",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("message")
			expect(data.message).toContain("Email et mot de passe requis")
		})

		it("devrait rejeter la connexion sans mot de passe", async () => {
			const loginData = {
				email: "admin@example.com",
			}

			const res = await app.request("/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(loginData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("message")
			expect(data.message).toContain("Email et mot de passe requis")
		})
	})
})
