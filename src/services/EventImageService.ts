import { EventImage } from "@prisma/client"
import prisma from "../lib/prisma"

export class EventImageService {
	async findAll(): Promise<EventImage[]> {
		return prisma.eventImage.findMany()
	}

	async findById(id: string): Promise<EventImage | null> {
		return prisma.eventImage.findUnique({
			where: { id },
		})
	}

	async create(data: Omit<EventImage, "id" | "createdAt" | "updatedAt">): Promise<EventImage> {
		return prisma.eventImage.create({
			data,
		})
	}

	async update(id: string, data: Partial<EventImage>): Promise<EventImage> {
		return prisma.eventImage.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<EventImage> {
		return prisma.eventImage.delete({
			where: { id },
		})
	}
}
