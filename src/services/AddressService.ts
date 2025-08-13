import { Address, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class AddressService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async findById(id: string): Promise<Address | null> {
		return this.prismaClient.address.findUnique({
			where: { id },
		})
	}

	async create(data: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address> {
		return this.prismaClient.address.create({
			data,
		})
	}
}
