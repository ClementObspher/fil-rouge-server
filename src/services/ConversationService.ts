import { Conversation, PrivateMessage, PrismaClient } from "@prisma/client"
import prisma from "../lib/prisma"

export class ConversationService {
	private prismaClient: PrismaClient

	constructor(prismaClient?: PrismaClient) {
		this.prismaClient = prismaClient || prisma
	}

	async createConversation(participants: string[]): Promise<Conversation> {
		return this.prismaClient.conversation.create({
			data: {
				participants: {
					connect: participants.map((id) => ({ id })),
				},
			},
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
			},
		})
	}

	async getConversationById(id: string): Promise<Conversation | null> {
		return this.prismaClient.conversation.findUnique({
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
				privateMessages: {
					include: {
						reactions: {
							include: {
								sender: true,
							},
						},
					},
				},
			},
		})
	}

	async getConversationsByUserIds(userIds: string[]): Promise<Conversation | null> {
		return this.prismaClient.conversation.findFirst({
			where: { participants: { some: { id: { in: userIds } } } },
			include: {
				participants: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						avatar: true,
					},
				},
				privateMessages: {
					include: {
						reactions: {
							include: {
								sender: true,
							},
						},
					},
				},
			},
		})
	}

	async getMessagesByConversationId(conversationId: string): Promise<PrivateMessage[]> {
		return this.prismaClient.privateMessage.findMany({
			where: { conversationId },
		})
	}

	async pushMessage(conversationId: string, senderId: string, message: string): Promise<PrivateMessage> {
		return this.prismaClient.privateMessage.create({
			data: {
				conversationId,
				senderId,
				content: message,
			},
		})
	}

	async updateMessage(messageId: string, content: string): Promise<PrivateMessage> {
		return this.prismaClient.privateMessage.update({
			where: { id: messageId },
			data: { content },
		})
	}
}
