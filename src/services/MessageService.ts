import { Message, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class MessageService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<any[]> {
		return this.prismaClient.message.findMany({
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
						role: true,
					},
				},
				reactions: true,
			},
		})
	}

	async findById(id: string): Promise<any | null> {
		return this.prismaClient.message.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
						role: true,
					},
				},
				reactions: {
					include: {
						sender: true,
					},
				},
			},
		})
	}

	async findByEventId(eventId: string): Promise<any[]> {
		return this.prismaClient.message.findMany({
			where: { eventId },
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
						role: true,
					},
				},
				reactions: {
					include: {
						sender: true,
					},
				},
			},
		})
	}

	async create(data: Omit<Message, "id" | "createdAt" | "updatedAt">): Promise<Message> {
		return this.prismaClient.message.create({
			data,
		})
	}

	async update(id: string, data: Partial<Message>): Promise<Message> {
		return this.prismaClient.message.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<Message> {
		return this.prismaClient.message.delete({
			where: { id },
		})
	}
}
