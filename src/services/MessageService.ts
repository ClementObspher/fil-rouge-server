import { Message } from "@prisma/client"
import prisma from "../lib/prisma"

export class MessageService {
	async findAll(): Promise<any[]> {
		return prisma.message.findMany({
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
		return prisma.message.findUnique({
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
		return prisma.message.findMany({
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
		return prisma.message.create({
			data,
		})
	}

	async update(id: string, data: Partial<Message>): Promise<Message> {
		return prisma.message.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<Message> {
		return prisma.message.delete({
			where: { id },
		})
	}
}
