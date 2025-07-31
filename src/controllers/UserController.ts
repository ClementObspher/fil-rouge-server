import { Context } from "hono"
import { UserService } from "../services/UserService"
import { User } from "@prisma/client"
import { uploadImage } from "../lib/minioController"

const userService = new UserService()

export class UserController {
	async getAll(c: Context) {
		try {
			const users = await userService.findAll()
			return c.json(users)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des utilisateurs" }, 500)
		}
	}

	async getById(c: Context) {
		try {
			const id = c.req.param("id")
			const user = await userService.findById(id)

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
			const user = await userService.create(data)
			return c.json(user, 201)
		} catch (error) {
			return c.json({ error: "Erreur lors de la création de l'utilisateur" }, 500)
		}
	}

	async update(c: Context) {
		try {
			const id = c.req.param("id")
			const data = await c.req.json<Partial<User>>()
			const user = await userService.update(id, data)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'utilisateur" }, 500)
		}
	}

	async delete(c: Context) {
		try {
			const id = c.req.param("id")
			await userService.delete(id)
			return c.json({ message: "Utilisateur supprimé avec succès" })
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'utilisateur" }, 500)
		}
	}

	async addFriend(c: Context) {
		try {
			const userId = c.req.param("id")
			const { friendId } = await c.req.json<{ friendId: string }>()
			const user = await userService.addFriend(userId, friendId)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de l'ajout de l'ami" }, 500)
		}
	}

	async getFriends(c: Context) {
		try {
			const userId = c.req.param("id")
			const friends = await userService.getFriends(userId)
			return c.json(friends)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des amis" }, 500)
		}
	}

	async removeFriend(c: Context) {
		try {
			const userId = c.req.param("id")
			const friendId = c.req.param("friendId")
			const user = await userService.removeFriend(userId, friendId)
			return c.json(user)
		} catch (error) {
			return c.json({ error: "Erreur lors de la suppression de l'ami" }, 500)
		}
	}

	async sendFriendRequest(c: Context) {
		try {
			const userId = c.req.param("id")
			const { friendId } = await c.req.json<{ friendId: string }>()
			const user = await userService.sendFriendRequest(userId, friendId)
			return c.json({ message: "Demande d'ami envoyée avec succès", user })
		} catch (error: any) {
			console.log(error)
			return c.json({ error: error.message || "Erreur lors de l'envoi de la demande d'ami" }, 400)
		}
	}

	async acceptFriendRequest(c: Context) {
		try {
			const userId = c.req.param("id")
			const { requestId } = await c.req.json<{ requestId: string }>()
			const user = await userService.acceptFriendRequest(requestId, userId)
			return c.json({ message: "Demande d'ami acceptée", user })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors de l'acceptation de la demande d'ami" }, 400)
		}
	}

	async declineFriendRequest(c: Context) {
		try {
			const userId = c.req.param("id")
			const { requestId } = await c.req.json<{ requestId: string }>()
			await userService.declineFriendRequest(requestId, userId)
			return c.json({ message: "Demande d'ami refusée" })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors du refus de la demande d'ami" }, 400)
		}
	}

	async cancelFriendRequest(c: Context) {
		try {
			const userId = c.req.param("id")
			const { requestId } = await c.req.json<{ requestId: string }>()
			await userService.cancelFriendRequest(userId, requestId)
			return c.json({ message: "Demande d'ami annulée" })
		} catch (error: any) {
			return c.json({ error: error.message || "Erreur lors de l'annulation de la demande d'ami" }, 400)
		}
	}

	async getPendingFriendRequests(c: Context) {
		try {
			const userId = c.req.param("id")
			const requests = await userService.getPendingFriendRequests(userId)
			return c.json(requests)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des demandes d'ami" }, 500)
		}
	}

	async getSentFriendRequests(c: Context) {
		try {
			const userId = c.req.param("id")
			const requests = await userService.getSentFriendRequests(userId)
			return c.json(requests)
		} catch (error) {
			return c.json({ error: "Erreur lors de la récupération des demandes envoyées" }, 500)
		}
	}

	async updateAvatar(c: Context) {
		try {
			const userId = c.req.param("id")
			const file = (c.req as any).file
			if (!file) {
				return c.json({ error: "Aucun fichier n'a été uploadé" }, 400)
			}
			const imageUrl = await uploadImage(file.buffer, file.originalname)

			await userService.updateAvatar(userId, imageUrl)

			return c.json({ message: "Avatar mis à jour", imageUrl })
		} catch (error) {
			return c.json({ error: "Erreur lors de la mise à jour de l'avatar" }, 500)
		}
	}
}
