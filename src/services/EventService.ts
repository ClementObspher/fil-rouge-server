import { Event, Prisma, PrismaClient, EventType } from "@prisma/client"
import prisma from "../lib/prisma"

export class EventService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<(Event & { participants: any[]; owner: any; address: any })[]> {
		return this.prismaClient.event.findMany({
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

	async findById(id: string): Promise<(Event & { participants: any[]; owner: any; address: any }) | null> {
		return this.prismaClient.event.findUnique({
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

	async findByUserId(userId: string): Promise<(Event & { participants: any[]; owner: any; address: any })[]> {
		return this.prismaClient.event.findMany({
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

	async findByTypes(types: EventType[]): Promise<(Event & { address: any })[]> {
		return this.prismaClient.event.findMany({
			where: { type: { in: types } },
			include: {
				address: true,
			},
		})
	}

	async findByParticipantId(userId: string): Promise<(Event & { participants: any[]; owner: any; address: any })[]> {
		return this.prismaClient.event.findMany({
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

	async create(data: Omit<Event, "id" | "createdAt" | "updatedAt">): Promise<Event & { participants: any[]; owner: any; address: any }> {
		return this.prismaClient.event.create({
			data,
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

	async update(id: string, data: Partial<Prisma.EventUpdateInput>): Promise<Event & { participants: any[]; owner: any; address: any }> {
		return this.prismaClient.event.update({
			where: { id },
			data,
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

	async delete(id: string): Promise<Event & { participants: any[]; owner: any; address: any }> {
		return this.prismaClient.event.delete({
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
}
