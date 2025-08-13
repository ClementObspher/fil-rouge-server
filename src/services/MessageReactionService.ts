import { MessageReaction, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class MessageReactionService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<MessageReaction[]> {
		return this.prismaClient.messageReaction.findMany()
	}

	async findById(id: string): Promise<MessageReaction | null> {
		return this.prismaClient.messageReaction.findUnique({
			where: { id },
		})
	}

	async findByMessageId(messageId: string): Promise<MessageReaction[]> {
		return this.prismaClient.messageReaction.findMany({
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
		return this.prismaClient.messageReaction.create({
			data,
		})
	}

	async update(id: string, data: Partial<MessageReaction>): Promise<MessageReaction> {
		return this.prismaClient.messageReaction.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<MessageReaction> {
		return this.prismaClient.messageReaction.delete({
			where: { id },
		})
	}
}
