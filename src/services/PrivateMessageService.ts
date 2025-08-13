import { PrivateMessage, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class PrivateMessageService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findAll(): Promise<PrivateMessage[]> {
		return this.prismaClient.privateMessage.findMany()
	}

	async findById(id: string): Promise<PrivateMessage | null> {
		return this.prismaClient.privateMessage.findUnique({
			where: { id },
		})
	}

	async create(data: Omit<PrivateMessage, "id" | "createdAt" | "updatedAt">): Promise<PrivateMessage> {
		return this.prismaClient.privateMessage.create({
			data,
		})
	}

	async update(id: string, data: Partial<PrivateMessage>): Promise<PrivateMessage> {
		return this.prismaClient.privateMessage.update({
			where: { id },
			data,
		})
	}

	async delete(id: string): Promise<PrivateMessage> {
		return this.prismaClient.privateMessage.delete({
			where: { id },
		})
	}
}
