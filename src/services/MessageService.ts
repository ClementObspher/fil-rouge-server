import { Message } from "@prisma/client"
import prisma from "../lib/prisma"

export class MessageService {
	async findAll(): Promise<Message[]> {
		return prisma.message.findMany()
	}

	async findById(id: string): Promise<Message | null> {
		return prisma.message.findUnique({
			where: { id },
		})
	}

	async findByEventId(eventId: string): Promise<Message[]> {
		return prisma.message.findMany({
			where: { eventId },
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
