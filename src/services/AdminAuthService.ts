import { sign, verify } from "jsonwebtoken"
import { compare } from "bcrypt"
import { PrismaClient, Role } from "@prisma/client"
import prisma from "../lib/prisma"
import { logAuthFailure } from "../middleware/monitoring"

export interface LoginRequestInfo {
	ip: string
	userAgent: string
	path: string
	requestId: string
}

export interface LoginResult {
	success: boolean
	message: string
	data?: {
		token: string
		user: {
			id: string
			email: string
			username: string
			role: Role
			permissions: string[]
		}
		expiresIn: string
	}
	statusCode: number
}

export interface VerifyTokenResult {
	success: boolean
	message: string
	data?: {
		user: {
			username: string
			role: string
			permissions: string[]
		}
		expiresAt: string
	}
	statusCode: number
}

export class AdminAuthService {
	private JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt"
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		if (prismaClient) {
			this.prismaClient = prismaClient
		} else if (process.env.NODE_ENV === "test") {
			// En environnement de test, créer un nouveau client Prisma avec la base de test
			this.prismaClient = new PrismaClient({
				datasources: {
					db: {
						url: process.env.DATABASE_URL_TEST || "postgresql://test:test@localhost:5432/kifekoi_test",
					},
				},
			})
		} else {
			this.prismaClient = prisma
		}
	}

	/**
	 * Authentification admin
	 */
	async login(email: string, password: string, requestInfo: LoginRequestInfo): Promise<LoginResult> {
		// Validation des données d'entrée
		if (!email || !password) {
			return {
				success: false,
				message: "Email et mot de passe requis",
				statusCode: 400,
			}
		}

		// Rechercher l'utilisateur dans la base de données
		const user = await this.prismaClient.user.findUnique({
			where: { email },
		})

		if (!user) {
			// Log de l'échec d'authentification pour déclenchement brute force
			logAuthFailure(requestInfo.ip, requestInfo.userAgent, requestInfo.path, requestInfo.requestId)

			return {
				success: false,
				message: "Identifiants incorrects",
				statusCode: 401,
			}
		}

		// Vérifier que l'utilisateur a le rôle admin
		if (user.role !== Role.ADMIN) {
			// Log de l'échec d'authentification pour déclenchement brute force
			logAuthFailure(requestInfo.ip, requestInfo.userAgent, requestInfo.path, requestInfo.requestId)

			return {
				success: false,
				message: "Accès réservé aux administrateurs",
				statusCode: 403,
			}
		}

		// Vérifier le mot de passe
		const isValidPassword = await compare(password, user.password)
		if (!isValidPassword) {
			// Log de l'échec d'authentification pour déclenchement brute force
			logAuthFailure(requestInfo.ip, requestInfo.userAgent, requestInfo.path, requestInfo.requestId)

			return {
				success: false,
				message: "Identifiants incorrects",
				statusCode: 401,
			}
		}

		// Générer un JWT avec les infos admin
		const payload = {
			userId: user.id,
			email: user.email,
			username: `${user.firstname} ${user.lastname}`,
			role: user.role,
			permissions: ["monitoring", "anomalies", "dashboard"],
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h d'expiration
		}

		const token = sign(payload, this.JWT_SECRET)

		return {
			success: true,
			message: "Connexion admin réussie",
			data: {
				token,
				user: {
					id: user.id,
					email: user.email,
					username: `${user.firstname} ${user.lastname}`,
					role: user.role,
					permissions: payload.permissions,
				},
				expiresIn: "24h",
			},
			statusCode: 200,
		}
	}

	/**
	 * Vérification du token admin
	 */
	async verifyToken(authHeader: string | undefined): Promise<VerifyTokenResult> {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return {
				success: false,
				message: "Token manquant",
				statusCode: 401,
			}
		}

		const token = authHeader.split(" ")[1]

		try {
			const decoded = verify(token, this.JWT_SECRET) as any

			if (decoded.role !== "ADMIN") {
				return {
					success: false,
					message: "Accès admin requis",
					statusCode: 403,
				}
			}

			return {
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
				statusCode: 200,
			}
		} catch (jwtError) {
			return {
				success: false,
				message: "Token invalide ou expiré",
				statusCode: 401,
			}
		}
	}

	/**
	 * Extraction des informations de requête pour le monitoring
	 */
	extractRequestInfo(c: any): LoginRequestInfo {
		return {
			ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
			userAgent: c.req.header("user-agent") || "unknown",
			path: c.req.path,
			requestId: c.req.header("x-request-id") || "unknown",
		}
	}
}
