import { Hono } from "hono"
import { sign } from "jsonwebtoken"
import { bruteForceProtectionMiddleware, logAuthFailure } from "../middleware/monitoring"

const app = new Hono()
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"

// Application du middleware de protection brute force
app.use("/*", bruteForceProtectionMiddleware)

/**
 * POST /admin/login - Authentification admin
 */
app.post("/login", async (c) => {
	try {
		const body = await c.req.json()
		const { username, password } = body

		// Validation simple des identifiants admin
		if ((username === "admin" && password === "admin123") || (username === "admin" && password === "admin")) {
			// Générer un JWT avec les infos admin
			const payload = {
				username: "admin",
				role: "admin",
				permissions: ["monitoring", "anomalies", "dashboard"],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h d'expiration
			}

			const token = sign(payload, JWT_SECRET)

			return c.json({
				success: true,
				message: "Connexion admin réussie",
				data: {
					token,
					user: {
						username: payload.username,
						role: payload.role,
						permissions: payload.permissions,
					},
					expiresIn: "24h",
				},
			})
		} else {
			// Log de l'échec d'authentification pour déclenchement brute force
			const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
			const userAgent = c.req.header("user-agent") || "unknown"
			const requestId = c.req.header("x-request-id") || "unknown"
			
			logAuthFailure(ip, userAgent, c.req.path, requestId)
			
			return c.json(
				{
					success: false,
					message: "Identifiants incorrects",
				},
				401
			)
		}
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

/**
 * POST /admin/verify - Vérification du token
 */
app.post("/verify", async (c) => {
	try {
		const authHeader = c.req.header("Authorization")

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json(
				{
					success: false,
					message: "Token manquant",
				},
				401
			)
		}

		const token = authHeader.split(" ")[1]
		const { verify } = await import("jsonwebtoken")

		try {
			const decoded = verify(token, JWT_SECRET) as any

			if (decoded.role !== "admin") {
				return c.json(
					{
						success: false,
						message: "Accès admin requis",
					},
					403
				)
			}

			return c.json({
				success: true,
				message: "Token valide",
				data: {
					user: {
						username: decoded.username,
						role: decoded.role,
						permissions: decoded.permissions,
					},
					expiresAt: new Date(decoded.exp * 1000).toISOString(),
				},
			})
		} catch (jwtError) {
			return c.json(
				{
					success: false,
					message: "Token invalide ou expiré",
				},
				401
			)
		}
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
