import { Context, Next } from "hono"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"

export async function adminAuthMiddleware(c: Context, next: Next) {
	const path = c.req.path
	if (path.includes(".html") || path.includes(".css") || path.includes(".js")) {
		await next()
		return
	}

	const authHeader = c.req.header("Authorization")

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json(
			{
				error: "Accès non autorisé. Token manquant.",
				redirectTo: "/admin-login",
			},
			401
		)
	}

	const token = authHeader.split(" ")[1]

	try {
		const decoded = verify(token, JWT_SECRET) as any

		if (decoded.role !== "ADMIN") {
			return c.json(
				{
					error: "Accès réservé aux administrateurs.",
					redirectTo: "/admin-login",
				},
				403
			)
		}

		c.set("user", decoded)
		await next()
		return
	} catch (error) {
		return c.json(
			{
				error: "Token invalide ou expiré.",
				redirectTo: "/admin-login",
			},
			401
		)
	}
}

/**
 * Middleware pour vérifier l'authentification côté web (redirection)
 */
export async function webAuthMiddleware(c: Context, next: Next) {
	const path = c.req.path

	if (path === "/admin-login" || path === "/admin-login.html") {
		await next()
		return
	}

	await next()
}
