import { User, FriendRequestStatus } from "@prisma/client"
import { hash } from "bcrypt"
import prisma from "../lib/prisma"

export class UserService {
	async findAll(): Promise<User[]> {
		return prisma.user.findMany()
	}

	async findById(id: string): Promise<Omit<User, "password"> | null> {
		return prisma.user.findUnique({
			where: { id },
			omit: {
				password: true,
			},
		})
	}

	async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
		const hashedPassword = await hash(data.password, 10)
		return prisma.user.create({
			data: {
				...data,
				password: hashedPassword,
			},
		})
	}

	async update(id: string, data: Partial<User>): Promise<User> {
		if (data.password) {
			data.password = await hash(data.password, 10)
		}
		return prisma.user.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<User> {
		return prisma.user.delete({
			where: { id },
		})
	}

	async sendFriendRequest(userId: string, friendId: string): Promise<User> {
		// Vérifier que l'utilisateur n'essaie pas de s'envoyer une demande à lui-même
		if (userId === friendId) {
			throw new Error("Vous ne pouvez pas vous envoyer une demande d'ami à vous-même")
		}

		// Vérifier que les deux utilisateurs existent
		const [sender, receiver] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), prisma.user.findUnique({ where: { id: friendId } })])

		if (!sender || !receiver) {
			throw new Error("Utilisateur non trouvé")
		}

		// Vérifier qu'ils ne sont pas déjà amis
		const existingFriendship = await prisma.user.findFirst({
			where: {
				id: userId,
				User_A: { some: { id: friendId } },
			},
		})

		if (existingFriendship) {
			throw new Error("Ces utilisateurs sont déjà amis")
		}

		// Vérifier s'il y a une demande d'ami existante (peu importe le statut)
		const existingRequest = await prisma.friendRequest.findFirst({
			where: {
				OR: [
					{ senderId: userId, receiverId: friendId },
					{ senderId: friendId, receiverId: userId },
				],
			},
		})

		if (existingRequest) {
			if (existingRequest.status === FriendRequestStatus.PENDING) {
				throw new Error("Une demande d'ami est déjà en attente entre ces utilisateurs")
			} else {
				// Si une demande existe avec un autre statut, la supprimer et en créer une nouvelle
				await prisma.friendRequest.delete({
					where: { id: existingRequest.id },
				})
			}
		}

		// Créer la nouvelle demande d'ami
		await prisma.friendRequest.create({
			data: {
				senderId: userId,
				receiverId: friendId,
				status: FriendRequestStatus.PENDING,
			},
		})

		return receiver
	}

	async acceptFriendRequest(requestId: string, userId: string): Promise<User> {
		const request = await prisma.friendRequest.findUnique({
			where: { id: requestId },
			include: { sender: true, receiver: true },
		})

		if (!request) {
			throw new Error("Demande d'ami non trouvée")
		}

		if (request.receiverId !== userId) {
			throw new Error("Vous n'êtes pas autorisé à accepter cette demande")
		}

		if (request.status !== FriendRequestStatus.PENDING) {
			throw new Error("Cette demande a déjà été traitée")
		}

		// Utiliser une transaction pour s'assurer de la cohérence
		await prisma.$transaction(async (tx) => {
			// Mettre à jour le statut de la demande
			await tx.friendRequest.update({
				where: { id: requestId },
				data: { status: FriendRequestStatus.ACCEPTED },
			})

			// Ajouter la relation d'amitié (bidirectionnelle)
			await tx.user.update({
				where: { id: request.senderId },
				data: {
					User_A: { connect: { id: request.receiverId } },
				},
			})

			await tx.user.update({
				where: { id: request.receiverId },
				data: {
					User_A: { connect: { id: request.senderId } },
				},
			})
		})

		return request.sender
	}

	async declineFriendRequest(requestId: string, userId: string): Promise<void> {
		const request = await prisma.friendRequest.findUnique({
			where: { id: requestId },
		})

		if (!request) {
			throw new Error("Demande d'ami non trouvée")
		}

		if (request.receiverId !== userId) {
			throw new Error("Vous n'êtes pas autorisé à refuser cette demande")
		}

		if (request.status !== FriendRequestStatus.PENDING) {
			throw new Error("Cette demande a déjà été traitée")
		}

		await prisma.friendRequest.update({
			where: { id: requestId },
			data: { status: FriendRequestStatus.DECLINED },
		})
	}

	async cancelFriendRequest(userId: string, requestId: string): Promise<void> {
		await prisma.friendRequest.update({
			where: { id: requestId, senderId: userId },
			data: { status: FriendRequestStatus.CANCELLED },
		})
	}

	async getPendingFriendRequests(userId: string): Promise<any[]> {
		return prisma.friendRequest.findMany({
			where: {
				receiverId: userId,
				status: FriendRequestStatus.PENDING,
			},
			include: {
				sender: {
					select: {
						id: true,
						avatar: true,
						firstname: true,
						lastname: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		})
	}

	async getSentFriendRequests(userId: string): Promise<any[]> {
		return prisma.friendRequest.findMany({
			where: {
				senderId: userId,
				status: FriendRequestStatus.PENDING,
			},
			include: {
				receiver: {
					select: {
						id: true,
						avatar: true,
						firstname: true,
						lastname: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		})
	}

	async addFriend(userId: string, friendId: string): Promise<User> {
		return prisma.user.update({
			where: { id: userId },
			data: {
				User_A: {
					connect: { id: friendId },
				},
			},
		})
	}

	async getFriends(userId: string): Promise<User[]> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { User_A: true, User_B: true },
		})
		return user?.User_A || []
	}

	async removeFriend(userId: string, friendId: string): Promise<User> {
		// Utiliser une transaction pour s'assurer de la cohérence
		await prisma.$transaction(async (tx) => {
			// Supprimer la relation d'amitié bidirectionnelle
			await tx.user.update({
				where: { id: userId },
				data: {
					User_A: { disconnect: { id: friendId } },
				},
			})

			await tx.user.update({
				where: { id: friendId },
				data: {
					User_A: { disconnect: { id: userId } },
				},
			})

			// Supprimer toutes les demandes d'ami entre ces deux utilisateurs
			await tx.friendRequest.deleteMany({
				where: {
					OR: [
						{ senderId: userId, receiverId: friendId },
						{ senderId: friendId, receiverId: userId },
					],
				},
			})
		})

		return prisma.user.findUnique({ where: { id: userId } }) as Promise<User>
	}

	async updateAvatar(userId: string, imageUrl: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { avatar: imageUrl },
		})
	}
}
