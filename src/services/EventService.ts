import { Event, Prisma } from "@prisma/client"
import prisma from "../lib/prisma"
import { EventType } from "../enums/EventType"

export class EventService {
	async findAll(): Promise<Event[]> {
		return prisma.event.findMany({
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				address: true,
			},
		})
	}

	async findById(id: string): Promise<Event | null> {
		return prisma.event.findUnique({
			where: { id },
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				address: true,
			},
		})
	}

	async findByUserId(userId: string): Promise<Event[]> {
		return prisma.event.findMany({
			where: { ownerId: userId },
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				address: true,
			},
		})
	}

	async findByTypes(types: EventType[]): Promise<Event[]> {
		return prisma.event.findMany({
			where: { type: { in: types } },
			include: {
				address: true,
			},
		})
	}

	async findByParticipantId(userId: string): Promise<Event[]> {
		return prisma.event.findMany({
			where: { participants: { some: { id: userId } } },
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				address: true,
			},
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
