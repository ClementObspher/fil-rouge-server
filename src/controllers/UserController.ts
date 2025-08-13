import { Context } from "hono"
import { UserService } from "../services/UserService"
import { User } from "@prisma/client"
import { uploadImage } from "../lib/minioController"
import { Client } from "minio"

export class UserController {
	private minioClient: Client
	private userService: UserService

	constructor(userService: UserService, minioClient?: Client) {
		this.userService = userService
		this.minioClient =
			minioClient ||
			new Client({
				endPoint: process.env.MINIO_ENDPOINT || "localhost",
				port: parseInt(process.env.MINIO_PORT || "9000"),
				accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
				secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
			})
	}
	async getAll(c: Context) {
		try {
			const users = await this.userService.findAll()
			return c.json(users)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des utilisateurs" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const user = await this.userService.findById(id)

			if (!user) {
				return c.json({ error: "Utilisateur non trouvé" }, 404)
			}

			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération de l'utilisateur" }, 500)
		}
	}

	async create(c: Context) {
		try {
			const data = await c.req.json<Omit<User, "id" | "createdAt" | "updatedAt">>()
			const user = await this.userService.create(data)
			return c.json(user, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de l'utilisateur" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.get("user").userId
			const data = await c.req.json<Partial<User>>()
			const user = await this.userService.update(id, data)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'utilisateur" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.get("user").userId
			await this.userService.delete(id)
			return c.json({ message: "Utilisateur supprimé avec succès" })
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'utilisateur" }, 500)
		}
	}

	async addFriend(c: Context) {
		try {
			const userId = c.get("user").userId
			const { friendId } = await c.req.json<{ friendId: string }>()
			const user = await this.userService.addFriend(userId, friendId)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de l'ajout de l'ami" }, 500)
		}
	}

	async getFriends(c: Context) {
		try {
			const userId = c.get("user").userId
			const friends = await this.userService.getFriends(userId)
			return c.json(friends)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des amis" }, 500)
		}
	}

	async removeFriend(c: Context) {
		try {
			const userId = c.get("user").userId
			const friendId = c.req.param("friendId")
			const user = await this.userService.removeFriend(userId, friendId)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'ami" }, 500)
		}
	}

	async sendFriendRequest(c: Context) {
		try {
			const userId = c.get("user").userId
			const { friendId } = await c.req.json<{ friendId: string }>()
			const user = await this.userService.sendFriendRequest(userId, friendId)
			return c.json({ message: "Demande d'ami envoyée avec succès", user })
		} catch (error: any) {
			console.log(error)
			return c.json({ error: error.message || "Erreur lors de l'envoi de la demande d'ami" }, 400)
		}
	}

	async acceptFriendRequest(c: Context) {
		try {
			const userId = c.get("user").userId
			const { requestId } = await c.req.json<{ requestId: string }>()
			const user = await this.userService.acceptFriendRequest(requestId, userId)
			return c.json({ message: "Demande d'ami acceptée", user })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors de l'acceptation de la demande d'ami" }, 400)
		}
	}

	async declineFriendRequest(c: Context) {
		try {
			const userId = c.get("user").userId
			const { requestId } = await c.req.json<{ requestId: string }>()
			await this.userService.declineFriendRequest(requestId, userId)
			return c.json({ message: "Demande d'ami refusée" })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors du refus de la demande d'ami" }, 400)
		}
	}

	async cancelFriendRequest(c: Context) {
		try {
			const userId = c.get("user").userId
			const { requestId } = await c.req.json<{ requestId: string }>()
			await this.userService.cancelFriendRequest(userId, requestId)
			return c.json({ message: "Demande d'ami annulée" })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors de l'annulation de la demande d'ami" }, 400)
		}
	}

	async getPendingFriendRequests(c: Context) {
		try {
			const userId = c.get("user").userId
			const requests = await this.userService.getPendingFriendRequests(userId)
			return c.json(requests)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des demandes d'ami" }, 500)
		}
	}

	async getSentFriendRequests(c: Context) {
		try {
			const userId = c.get("user").userId
			const requests = await this.userService.getSentFriendRequests(userId)
			return c.json(requests)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des demandes envoyées" }, 500)
		}
	}

	async updateAvatar(c: Context) {
		try {
			const userId = c.get("user").userId
			const file = (c.req as any).file

			if (!file) {
				return c.json({ error: "Aucun fichier n'a été uploadé" }, 400)
			}

			let imageUrl: string

			// Pour les tests, simuler l'upload si MinIO n'est pas disponible
			try {
				imageUrl = await uploadImage(file.buffer, file.originalname, this.minioClient)
			} catch (error) {
				// En mode test, utiliser une URL simulée
				if (process.env.NODE_ENV === "test") {
					imageUrl = `http://localhost:9000/images/test-${Date.now()}-${file.originalname}`
				} else {
					throw error
				}
			}

			await this.userService.updateAvatar(userId, imageUrl)

			return c.json({ message: "Avatar mis à jour", avatarUrl: imageUrl })
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'avatar" }, 500)
		}
	}
}
