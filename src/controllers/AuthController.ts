import { Context } from "hono"
import { AuthService } from "../services/AuthService"
import { User } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { UserService } from "../services/UserService"
import { logAuthFailure } from "../middleware/monitoring"
import { Client } from "minio"

export class AuthController {
	private authService: AuthService
	private userService: UserService
	private minioClient: Client

	constructor(authService?: AuthService, userService?: UserService, minioClient?: Client) {
		this.authService = authService || new AuthService()
		this.userService = userService || new UserService()
		this.minioClient =
			minioClient ||
			new Client({
				endPoint: process.env.MINIO_ENDPOINT || "localhost",
				port: parseInt(process.env.MINIO_PORT || "9000"),
				accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
				secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
			})
	}

	async login(c: Context) {
		try {
			const { email, password } = await c.req.json<{
				email: string
				password: string
			}>()

			const result = await this.authService.login(email, password)
			return c.json(result)
		} catch (error) {
			// Log de l'échec d'authentification pour déclenchement brute force
			const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
			const userAgent = c.req.header("user-agent") || "unknown"
			const requestId = c.req.header("x-request-id") || "unknown"

			logAuthFailure(ip, userAgent, c.req.path, requestId)

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

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(data.email)) {
				return c.json({ error: "L'email n'est pas valide" }, 400)
			}

			const user = await this.authService.register(userData)

			if (data.avatar) {
				const base64Data = data.avatar.split(",")[1]
				const buffer = Buffer.from(base64Data, "base64")
				const avatar = await uploadImage(buffer, `${data.firstname}-${data.lastname}-avatar.jpg`, this.minioClient)
				await this.userService.updateAvatar(user.id, avatar)
			}

			return c.json(user, 201)
		} catch (error) {
			if (error instanceof Error) {
				return c.json({ error: error.message }, 400)
			}
			return c.json({ error: "Erreur lors de l'inscription" }, 500)
		}
	}
}
