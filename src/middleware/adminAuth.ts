import { Context, Next } from "hono"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"

/**
 * Middleware d'authentification admin pour les routes de monitoring et anomalies
 */
export async function adminAuthMiddleware(c: Context, next: Next) {
	// Vérifier si c'est une route de fichier statique (pas d'auth nécessaire)
	const path = c.req.path
	if (path.includes(".html") || path.includes(".css") || path.includes(".js")) {
		await next()
		return
	}

	// Vérifier le token JWT
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
		// Vérifier et décoder le JWT
		const decoded = verify(token, JWT_SECRET) as any

		// Vérifier que c'est un admin
		if (decoded.role !== "ADMIN") {
			return c.json(
				{
					error: "Accès réservé aux administrateurs.",
					redirectTo: "/admin-login",
				},
				403
			)
		}

		// Définir le contexte utilisateur
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
 * Utilisé pour les pages HTML qui nécessitent une redirection
 */
export async function webAuthMiddleware(c: Context, next: Next) {
	const path = c.req.path

	// Si c'est déjà la page de login, continuer
	if (path === "/admin-login" || path === "/admin-login.html") {
		await next()
		return
	}

	// Pour les pages web, on laisse JavaScript côté client gérer la vérification JWT
	// Ce middleware est maintenant optionnel car la vérification se fait côté client
	await next()
}
