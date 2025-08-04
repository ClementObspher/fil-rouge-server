import { PrivateMessageReaction } from "@prisma/client"
import prisma from "../lib/prisma"

export class PrivateMessageReactionService {
	async findAll(): Promise<PrivateMessageReaction[]> {
		return prisma.privateMessageReaction.findMany()
	}

	async findById(id: string): Promise<PrivateMessageReaction | null> {
		return prisma.privateMessageReaction.findUnique({
			where: { id },
		})
	}

	async findByMessageId(messageId: string): Promise<PrivateMessageReaction[]> {
		return prisma.privateMessageReaction.findMany({
			where: { messageId },
			include: {
				sender: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
						role: true,
					},
				},
			},
		})
	}

	async create(data: Omit<PrivateMessageReaction, "id" | "createdAt" | "updatedAt">): Promise<PrivateMessageReaction> {
		return prisma.privateMessageReaction.create({
			data,
		})
	}

	async update(id: string, data: Partial<PrivateMessageReaction>): Promise<PrivateMessageReaction> {
		return prisma.privateMessageReaction.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<PrivateMessageReaction> {
		return prisma.privateMessageReaction.delete({
			where: { id },
		})
	}
}
