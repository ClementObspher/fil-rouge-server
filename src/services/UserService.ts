import { User, FriendRequestStatus, PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"
import prisma from "../lib/prisma"

export class UserService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<User[]> {
		return this.prismaClient.user.findMany()
	}

	async findById(id: string): Promise<Omit<User, "password"> | null> {
		return this.prismaClient.user.findUnique({
			where: { id },
			omit: {
				password: true,
			},
		})
	}

	async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
		const hashedPassword = await hash(data.password, 10)
		return this.prismaClient.user.create({
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
		return this.prismaClient.user.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<User> {
		return this.prismaClient.user.delete({
			where: { id },
		})
	}

	async sendFriendRequest(userId: string, friendId: string): Promise<User> {
		if (userId === friendId) {
			throw new Error("Vous ne pouvez pas vous envoyer une demande d'ami à vous-même")
		}

		const [sender, receiver] = await Promise.all([this.prismaClient.user.findUnique({ where: { id: userId } }), this.prismaClient.user.findUnique({ where: { id: friendId } })])

		if (!sender || !receiver) {
			throw new Error("Utilisateur non trouvé")
		}

		const existingFriendship = await this.prismaClient.user.findFirst({
			where: {
				id: userId,
				User_A: { some: { id: friendId } },
			},
		})

		if (existingFriendship) {
			throw new Error("Ces utilisateurs sont déjà amis")
		}

		const existingRequest = await this.prismaClient.friendRequest.findFirst({
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
				await this.prismaClient.friendRequest.delete({
					where: { id: existingRequest.id },
				})
			}
		}

		await this.prismaClient.friendRequest.create({
			data: {
				senderId: userId,
				receiverId: friendId,
				status: FriendRequestStatus.PENDING,
			},
		})

		return receiver
	}

	async acceptFriendRequest(requestId: string, userId: string): Promise<User> {
		const request = await this.prismaClient.friendRequest.findUnique({
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

		await this.prismaClient.$transaction(async (tx) => {
			await tx.friendRequest.update({
				where: { id: requestId },
				data: { status: FriendRequestStatus.ACCEPTED },
			})

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
		const request = await this.prismaClient.friendRequest.findUnique({
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

		await this.prismaClient.friendRequest.update({
			where: { id: requestId },
			data: { status: FriendRequestStatus.DECLINED },
		})
	}

	async cancelFriendRequest(userId: string, requestId: string): Promise<void> {
		await this.prismaClient.friendRequest.update({
			where: { id: requestId, senderId: userId },
			data: { status: FriendRequestStatus.CANCELLED },
		})
	}

	async getPendingFriendRequests(userId: string): Promise<any[]> {
		return this.prismaClient.friendRequest.findMany({
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
		return this.prismaClient.friendRequest.findMany({
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
		return this.prismaClient.user.update({
			where: { id: userId },
			data: {
				User_A: {
					connect: { id: friendId },
				},
			},
		})
	}

	async getFriends(userId: string): Promise<User[]> {
		const user = await this.prismaClient.user.findUnique({
			where: { id: userId },
			include: { User_A: true, User_B: true },
		})
		return user?.User_A || []
	}

	async removeFriend(userId: string, friendId: string): Promise<User> {
		await this.prismaClient.$transaction(async (tx) => {
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

			await tx.friendRequest.deleteMany({
				where: {
					OR: [
						{ senderId: userId, receiverId: friendId },
						{ senderId: friendId, receiverId: userId },
					],
				},
			})
		})

		return this.prismaClient.user.findUnique({ where: { id: userId } }) as Promise<User>
	}

	async updateAvatar(userId: string, imageUrl: string): Promise<void> {
		await this.prismaClient.user.update({
			where: { id: userId },
			data: { avatar: imageUrl },
		})
	}
}
