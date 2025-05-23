import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import prisma from "../lib/prisma"
import { Role } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"

export class AuthService {
	async login(email: string, password: string) {
		const user = await prisma.user.findUnique({
			where: { email },
		})

		if (!user) {
			throw new Error("Utilisateur non trouvé")
		}

		const isValidPassword = await compare(password, user.password)
		if (!isValidPassword) {
			throw new Error("Mot de passe incorrect")
		}

		const token = sign(
			{
				userId: user.id,
				email: user.email,
				role: user.role,
			},
			JWT_SECRET,
			{ expiresIn: "24h" }
		)

		return {
			token,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		}
	}

	async register(email: string, password: string, name: string) {
		const existingUser = await prisma.user.findUnique({
			where: { email },
		})

		if (existingUser) {
			throw new Error("Utilisateur déjà existant")
		}

		const hashedPassword = await hash(password, 10)

		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role: Role.USER,
			},
		})

		const token = sign(
			{
				userId: user.id,
				email: user.email,
				role: user.role,
			},
			JWT_SECRET,
			{ expiresIn: "24h" }
		)

		return {
			token,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		}
	}
}
