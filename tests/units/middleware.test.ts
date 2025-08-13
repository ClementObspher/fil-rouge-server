import { describe, it, expect, beforeEach, vi } from "vitest"
import { Hono } from "hono"
import { authMiddleware } from "../../src/middleware/auth"
import { uploadSingle } from "../../src/middleware/upload"
import { verify } from "jsonwebtoken"

describe("Middleware Tests", () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		vi.clearAllMocks()
	})

	describe("authMiddleware", () => {
		it("devrait rejeter une requête sans header Authorization", async () => {
			app.use("/test", authMiddleware)
			app.get("/test", (c) => c.json({ success: true }))

			const res = await app.request("/test")

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe("Token manquant")
		})

		it("devrait rejeter une requête avec un format de token invalide", async () => {
			app.use("/test", authMiddleware)
			app.get("/test", (c) => c.json({ success: true }))

			const res = await app.request("/test", {
				headers: {
					Authorization: "InvalidFormat token",
				},
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe("Token manquant")
		})

		it("devrait rejeter une requête avec un token invalide", async () => {
			app.use("/test", authMiddleware)
			app.get("/test", (c) => c.json({ success: true }))

			const res = await app.request("/test", {
				headers: {
					Authorization: "Bearer invalid.token",
				},
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe("Token invalide")
		})
	})

	describe("uploadSingle middleware", () => {
		it("devrait gérer l'upload d'un fichier valide", async () => {
			app.use("/upload", uploadSingle("file"))
			app.post("/upload", (c) => {
				const file = (c.req as any).file
				return c.json({
					success: true,
					filename: file?.originalname,
					size: file?.size,
				})
			})

			// Créer un fichier de test
			const fileBuffer = Buffer.from("test file content")
			const formData = new FormData()
			formData.append("file", new Blob([fileBuffer]), "test.txt")

			const res = await app.request("/upload", {
				method: "POST",
				body: formData,
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.success).toBe(true)
		})

		it("devrait rejeter une requête sans fichier", async () => {
			app.use("/upload", uploadSingle("file"))
			app.post("/upload", (c) => c.json({ success: true }))

			const res = await app.request("/upload", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toBe("Erreur lors de l'upload du fichier")
		})

		it("devrait gérer les erreurs d'upload", async () => {
			// Simuler une erreur d'upload
			app.use("/upload", uploadSingle("file"))
			app.post("/upload", (c) => c.json({ success: true }))

			const res = await app.request("/upload", {
				method: "POST",
				headers: {
					"Content-Type": "multipart/form-data; boundary=test",
				},
				body: "invalid form data",
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toBe("Erreur lors de l'upload du fichier")
		})
	})
})
