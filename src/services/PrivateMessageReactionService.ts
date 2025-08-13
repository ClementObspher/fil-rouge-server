import { PrivateMessageReaction, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class PrivateMessageReactionService {
	private prisma: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prisma = prismaClient || prisma
	}

	async findAll(): Promise<PrivateMessageReaction[]> {
		return this.prisma.privateMessageReaction.findMany()
	}

	async findById(id: string): Promise<PrivateMessageReaction | null> {
		return this.prisma.privateMessageReaction.findUnique({
			where: { id },
		})
	}

	async findByMessageId(messageId: string): Promise<PrivateMessageReaction[]> {
		return this.prisma.privateMessageReaction.findMany({
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
		return this.prisma.privateMessageReaction.create({
			data,
		})
	}

	async update(id: string, data: Partial<PrivateMessageReaction>): Promise<PrivateMessageReaction> {
		return this.prisma.privateMessageReaction.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<PrivateMessageReaction> {
		return this.prisma.privateMessageReaction.delete({
			where: { id },
		})
	}
}
