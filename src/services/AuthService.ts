import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import prisma from "../lib/prisma"
import { Role, User } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "secret_jwt"

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

		return token
	}

	async register(data: Omit<User, "id" | "createdAt" | "updatedAt">) {
		const existingUser = await prisma.user.findUnique({
			where: { email: data.email },
		})

		if (existingUser) {
			throw new Error("Utilisateur déjà existant")
		}

		const hashedPassword = await hash(data.password, 10)

		return prisma.user.create({
			data: {
				email: data.email,
				password: hashedPassword,
				firstname: data.firstname,
				lastname: data.lastname,
				bio: data.bio,
				birthdate: data.birthdate,
				nationality: data.nationality,
				role: Role.USER,
			},
		})
	}
}
