import { Event, Prisma } from "@prisma/client"
import prisma from "../lib/prisma"

export class EventService {
	async findAll(): Promise<Event[]> {
		return prisma.event.findMany()
	}

	async findById(id: string): Promise<Event | null> {
		return prisma.event.findUnique({
			where: { id },
		})
	}

	async findByUserId(userId: string): Promise<Event[]> {
		return prisma.event.findMany({
			where: { ownerId: userId },
		})
	}

	async findByParticipantId(userId: string): Promise<Event[]> {
		return prisma.event.findMany({
			where: { participants: { some: { id: userId } } },
		})
	}

	async create(data: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<Event> {
		return prisma.event.create({
			data,
		})
	}

	async update(id: string, data: Partial<Prisma.EventUpdateInput>): Promise<Event> {
		return prisma.event.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<Event> {
		return prisma.event.delete({
			where: { id },
		})
	}
}
