import { MessageReaction } from "@prisma/client"
import prisma from "../lib/prisma"

export class MessageReactionService {
	async findAll(): Promise<MessageReaction[]> {
		return prisma.messageReaction.findMany()
	}

	async findById(id: string): Promise<MessageReaction | null> {
		return prisma.messageReaction.findUnique({
			where: { id },
		})
	}

	async findByMessageId(messageId: string): Promise<MessageReaction[]> {
		return prisma.messageReaction.findMany({
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

	async create(data: Omit<MessageReaction, "id" | "createdAt" | "updatedAt">): Promise<MessageReaction> {
		return prisma.messageReaction.create({
			data,
		})
	}

	async update(id: string, data: Partial<MessageReaction>): Promise<MessageReaction> {
		return prisma.messageReaction.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<MessageReaction> {
		return prisma.messageReaction.delete({
			where: { id },
		})
	}
}
