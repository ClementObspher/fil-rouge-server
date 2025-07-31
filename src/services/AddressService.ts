import { Address } from "@prisma/client"
import prisma from "../lib/prisma"

export class AddressService {
	async findById(id: string): Promise<Address | null> {
		return prisma.address.findUnique({
			where: { id },
		})
	}

	async create(data: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address> {
		return prisma.address.create({
			data,
		})
	}
}
