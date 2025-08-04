import { Context } from "hono"
import { AuthService } from "../services/AuthService"
import { User } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { UserService } from "../services/UserService"

const authService = new AuthService()
const userService = new UserService()

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
			const data = await c.req.json<Omit<User, "id" | "createdAt" | "updatedAt"> & { confirmPassword: string }>()

			if (data.password !== data.confirmPassword) {
				return c.json({ error: "Les mots de passe ne correspondent pas" }, 400)
			}

			const { confirmPassword, ...userData } = data

			const user = await authService.register(userData)

			if (data.avatar) {
				const base64Data = data.avatar.split(",")[1]
				const buffer = Buffer.from(base64Data, "base64")
				const avatar = await uploadImage(buffer, `${data.firstname}-${data.lastname}-avatar.jpg`)
				await userService.updateAvatar(user.id, avatar)
			}

			return c.json(user)
		} catch (error) {
			if (error instanceof Error) {
				return c.json({ error: error.message }, 400)
			}
			return c.json({ error: "Erreur lors de l'inscription" }, 500)
		}
	}
}
