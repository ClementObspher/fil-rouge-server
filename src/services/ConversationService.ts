import { Conversation, PrivateMessage } from "@prisma/client"
import prisma from "../lib/prisma"

export class ConversationService {
	async createConversation(participants: string[]): Promise<Conversation> {
		return prisma.conversation.create({
			data: {
				participants: {
					connect: participants.map((id) => ({ id })),
				},
			},
		})
	}

	async getConversationById(id: string): Promise<Conversation | null> {
		return prisma.conversation.findUnique({
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
		return prisma.conversation.findFirst({
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
		return prisma.privateMessage.findMany({
			where: { conversationId },
		})
	}

	async pushMessage(conversationId: string, senderId: string, message: string): Promise<PrivateMessage> {
		return prisma.privateMessage.create({
			data: {
				conversationId,
				senderId,
				content: message,
			},
		})
	}

	async updateMessage(messageId: string, content: string): Promise<PrivateMessage> {
		return prisma.privateMessage.update({
			where: { id: messageId },
			data: { content },
		})
	}
}
