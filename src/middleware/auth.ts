import { Context, Next } from "hono"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization")

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Token manquant" }, 401)
	}

	const token = authHeader.split(" ")[1]

	try {
		const decoded = verify(token, JWT_SECRET)
		c.set("user", decoded)
		await next()
	} catch (error) {
		return c.json({ error: "Token invalide" }, 401)
	}
}
