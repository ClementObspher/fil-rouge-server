import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { testPrisma, testUtils } from "./setup"
import auth from "../src/routes/auth"
import bcrypt from "bcrypt"

describe("Routes d'authentification", () => {
	let app: Hono

	beforeEach(async () => {
		app = new Hono()
		app.route("/api/auth", auth)
	})

	describe("POST /api/auth/register", () => {
		it("devrait créer un nouvel utilisateur avec des données valides", async () => {
			const userData = {
				email: `test${Date.now()}@example.com`,
				password: "password123",
				confirmPassword: "password123",
				firstname: "John",
				lastname: "Doe",
				bio: "Un utilisateur de test",
				nationality: "FR",
				birthdate: new Date().toISOString(),
			}

			const res = await app.request("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(userData),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data).toHaveProperty("email")
			expect(data).toHaveProperty("firstname")
			expect(data).toHaveProperty("lastname")
			expect(data).toHaveProperty("bio")
			expect(data).toHaveProperty("nationality")
			expect(data).toHaveProperty("birthdate")
			expect(data).toHaveProperty("role")
			expect(data).toHaveProperty("avatar")
			expect(data).toHaveProperty("createdAt")
			expect(data).toHaveProperty("updatedAt")
		})

		it("devrait rejeter l'inscription avec un email déjà existant", async () => {
			// Créer un utilisateur existant
			await testUtils.createTestUser({
				email: "existing@example.com",
				password: "password123",
				firstname: "John",
				lastname: "Doe",
				bio: "Un utilisateur de test",
				nationality: "FR",
				birthdate: new Date(),
			})

			const userData = {
				email: "existing@example.com",
				password: "password123",
				firstname: "John",
				lastname: "Doe",
				confirmPassword: "password123",
				bio: "Un utilisateur de test",
				nationality: "FR",
				birthdate: new Date().toISOString(),
			}

			const res = await app.request("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(userData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'inscription avec des données manquantes", async () => {
			const userData = {
				email: "test@example.com",
				// password manquant
				firstname: "John",
				// lastname manquant
				confirmPassword: "password123",
				bio: "Un utilisateur de test",
				nationality: "FR",
				birthdate: new Date().toISOString(),
			}

			const res = await app.request("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(userData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		it("devrait rejeter l'inscription avec un email invalide", async () => {
			const userData = {
				email: "invalid-email",
				password: "password123",
				confirmPassword: "password123",
				firstname: "John",
				lastname: "Doe",
				bio: "Un utilisateur de test",
				nationality: "FR",
				birthdate: new Date().toISOString(),
			}

			const res = await app.request("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(userData),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty("error")
		})

		describe("POST /api/auth/login", () => {
			it("devrait connecter un utilisateur avec des identifiants valides", async () => {
				await testUtils.createTestUser({
					email: "test@example.com",
					password: "password123",
					bio: "Un utilisateur de test",
					nationality: "FR",
					birthdate: new Date(),
					firstname: "John",
					lastname: "Doe",
				})

				const loginData = {
					email: "test@example.com",
					password: "password123",
				}

				const res = await app.request("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(loginData),
				})
				const data = await res.json()
				console.log(data)

				expect(res.status).toBe(200)
			})

			it("devrait rejeter la connexion avec un email inexistant", async () => {
				const loginData = {
					email: "nonexistent@example.com",
					password: "password123",
				}

				const res = await app.request("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(loginData),
				})

				expect(res.status).toBe(401)
				const data = await res.json()
				expect(data).toHaveProperty("error")
				expect(data.error).toContain("Utilisateur non trouvé")
			})

			it("devrait rejeter la connexion avec un mot de passe incorrect", async () => {
				await testUtils.createTestUser({
					email: "test@example.com",
					password: "password123",
					firstname: "John",
					lastname: "Doe",
					bio: "Un utilisateur de test",
					nationality: "FR",
					birthdate: new Date(),
				})

				const loginData = {
					email: "test@example.com",
					password: "wrongpassword",
				}

				const res = await app.request("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(loginData),
				})

				expect(res.status).toBe(401)
				const data = await res.json()
				console.log(data)
				expect(data).toHaveProperty("error")
				expect(data.error).toContain("Mot de passe incorrect")
			})

			it("devrait rejeter la connexion avec des données manquantes", async () => {
				const loginData = {
					email: "test@example.com",
					// password manquant
				}

				const res = await app.request("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(loginData),
				})

				expect(res.status).toBe(401)
				const data = await res.json()
				expect(data).toHaveProperty("error")
			})
		})
	})
})
