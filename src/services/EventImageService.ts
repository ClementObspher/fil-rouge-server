import { EventImage, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class EventImageService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<EventImage[]> {
		return this.prismaClient.eventImage.findMany()
	}

	async findById(id: string): Promise<EventImage | null> {
		return this.prismaClient.eventImage.findUnique({
			where: { id },
		})
	}

	async findByEventId(eventId: string): Promise<EventImage[]> {
		return this.prismaClient.eventImage.findMany({
			where: { eventId },
		})
	}

	async create(data: Omit<EventImage, "id" | "createdAt" | "updatedAt">): Promise<EventImage> {
		return this.prismaClient.eventImage.create({
			data,
		})
	}

	async update(id: string, data: Partial<EventImage>): Promise<EventImage> {
		return this.prismaClient.eventImage.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<EventImage> {
		return this.prismaClient.eventImage.delete({
			where: { id },
		})
	}
}
