import { Context } from "hono"
import { AuthService } from "../services/AuthService"

const authService = new AuthService()

export class AuthController {
	async login(c: Context) {
		try {
			const { email, password } = await c.req.json<{
				email: string
				password: string
			}>()

			const result = await authService.login(email, password)
			return c.json(result)
		} catch (error) {
			if (error instanceof Error) {
				return c.json({ error: error.message }, 401)
			}
			return c.json({ error: "Erreur lors de la connexion" }, 500)
		}
	}

	async register(c: Context) {
		try {
			const { email, password, name } = await c.req.json<{
				email: string
				password: string
				name: string
			}>()

			const result = await authService.register(email, password, name)
			return c.json(result)
		} catch (error) {
			if (error instanceof Error) {
				return c.json({ error: error.message }, 400)
			}
			return c.json({ error: "Erreur lors de l'inscription" }, 500)
		}
	}
}
