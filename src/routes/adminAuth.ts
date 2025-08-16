import { Hono } from "hono"
import { bruteForceProtectionMiddleware } from "../middleware/monitoring"
import { AdminAuthController } from "../controllers/AdminAuthController"
import { ContentfulStatusCode } from "hono/utils/http-status"

const app = new Hono()
const adminAuthController = new AdminAuthController()

app.use("/*", bruteForceProtectionMiddleware)

app.post("/login", async (c) => {
	try {
		const body = await c.req.json()
		const { email, password } = body

		const requestInfo = adminAuthController.extractRequestInfo(c)
		const result = await adminAuthController.login(email, password, requestInfo)

		return c.json(
			{
				success: result.success,
				message: result.message,
				...(result.data && { data: result.data }),
			},
			result.statusCode as ContentfulStatusCode
		)
	} catch (error) {
		console.error("Erreur lors de l'authentification admin:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de l'authentification",
			},
			500
		)
	}
})

app.post("/verify", async (c) => {
	try {
		const authHeader = c.req.header("Authorization")
		const result = await adminAuthController.verifyToken(authHeader)

		return c.json(
			{
				success: result.success,
				message: result.message,
				...(result.data && { data: result.data }),
			},
			result.statusCode as ContentfulStatusCode
		)
	} catch (error) {
		console.error("Erreur lors de la vérification du token:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la vérification",
			},
			500
		)
	}
})

export default app
