import { User } from "@prisma/client"
import { hash } from "bcrypt"
import prisma from "../lib/prisma"

export class UserService {
	async findAll(): Promise<User[]> {
		return prisma.user.findMany()
	}

	async findById(id: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: { id },
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

	async addFriend(userId: string, friendId: string): Promise<User> {
		return prisma.user.update({
			where: { id: userId },
			data: {
				friends: {
					connect: { id: friendId },
				},
			},
		})
	}

	async getFriends(userId: string): Promise<User[]> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { friends: true },
		})
		return user?.friends || []
	}

	async removeFriend(userId: string, friendId: string): Promise<User> {
		return prisma.user.update({
			where: { id: userId },
			data: {
				friends: { disconnect: { id: friendId } },
			},
		})
	}

	async updateAvatar(userId: string, imageUrl: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { avatar: imageUrl },
		})
	}
}
