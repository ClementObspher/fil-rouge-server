import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { testPrisma, testUtils } from "../setup"
import { UserService } from "../../src/services/UserService"
import { EventService } from "../../src/services/EventService"
import { MessageService } from "../../src/services/MessageService"
import { ConversationService } from "../../src/services/ConversationService"
import { LoggerService } from "../../src/services/LoggerService"
import { Conversation, EventType } from "@prisma/client"
import { EventStatus } from "@prisma/client"
import { User } from "@prisma/client"

describe("Integration Services Tests", () => {
	let userService: UserService
	let eventService: EventService
	let messageService: MessageService
	let conversationService: ConversationService
	let loggerService: LoggerService

	beforeEach(() => {
		userService = new UserService(testPrisma)
		eventService = new EventService(testPrisma)
		messageService = new MessageService(testPrisma)
		conversationService = new ConversationService(testPrisma)
		loggerService = new LoggerService()
	})

	describe("User-Event Integration", () => {
		it("devrait permettre à un utilisateur de créer et participer à un événement", async () => {
			// Créer un utilisateur
			const user = await testUtils.createTestUser({
				email: "organizer@test.com",
				password: "password123",
				firstname: "John",
				lastname: "Organizer",
			})

			// Créer une adresse pour l'événement
			const address = await testPrisma.address.create({
				data: {
					street: "123 Event Street",
					city: "Event City",
					postal_code: "12345",
					country: "France",
				},
			})

			// Créer un événement
			const event = await eventService.create({
				title: "Test Event",
				description: "A test event",
				startDate: new Date(Date.now() + 86400000), // Demain
				endDate: new Date(Date.now() + 86400000 + 3600000), // Demain + 1h
				addressId: address.id,
				ownerId: user.id,
				type: EventType.OTHER,
				status: EventStatus.PENDING,
				slug: "test-event",
				isPublic: true,
				isFeatured: false,
				isArchived: false,
				isCancelled: false,
				isDraft: false,
				isPublished: true,
				isUnlisted: false,
				isPrivate: false,
				coverImage: "https://example.com/cover.jpg",
			})

			expect(event).toBeDefined()
			expect(event.ownerId).toBe(user.id)
			expect(event.title).toBe("Test Event")

			// Vérifier que l'utilisateur est bien le propriétaire
			const userEvents = await eventService.findByUserId(user.id)
			expect(userEvents).toHaveLength(1)
			expect(userEvents[0].id).toBe(event.id)
		})

		it("devrait permettre à plusieurs utilisateurs de participer à un événement", async () => {
			// Créer un organisateur
			const organizer = await testUtils.createTestUser({
				email: "organizer@test.com",
				password: "password123",
				firstname: "John",
				lastname: "Organizer",
			})

			// Créer des participants
			const participant1 = await testUtils.createTestUser({
				email: "participant1@test.com",
				password: "password123",
				firstname: "Alice",
				lastname: "Participant",
			})

			const participant2 = await testUtils.createTestUser({
				email: "participant2@test.com",
				password: "password123",
				firstname: "Bob",
				lastname: "Participant",
			})

			// Créer une adresse
			const address = await testPrisma.address.create({
				data: {
					street: "123 Event Street",
					city: "Event City",
					postal_code: "12345",
					country: "France",
				},
			})

			// Créer un événement
			const event = await eventService.create({
				title: "Group Event",
				description: "A group event",
				startDate: new Date(Date.now() + 86400000),
				endDate: new Date(Date.now() + 86400000 + 3600000),
				addressId: address.id,
				ownerId: organizer.id,
				type: EventType.OTHER,
				status: EventStatus.PENDING,
				slug: "group-event",
				isPublic: true,
				isFeatured: false,
				isArchived: false,
				isCancelled: false,
				isDraft: false,
				isPublished: true,
				isUnlisted: false,
				isPrivate: false,
				coverImage: "https://example.com/cover.jpg",
			})

			// Ajouter des participants (simulation via la base de données)
			// Note: Dans un vrai test, vous utiliseriez les méthodes du service
			await testPrisma.event.update({
				where: { id: event.id },
				data: {
					participants: {
						connect: [{ id: participant1.id }, { id: participant2.id }],
					},
				},
			})

			// Vérifier les participants
			const updatedEvent = await eventService.findById(event.id)
			expect(updatedEvent?.participants).toHaveLength(2)
		})
	})

	describe("Conversation-Message Integration", () => {
		it("devrait permettre la création d'une conversation avec messages", async () => {
			// Créer des utilisateurs
			const user1 = await testUtils.createTestUser({
				email: "user1@test.com",
				password: "password123",
				firstname: "Alice",
				lastname: "User",
			})

			const user2 = await testUtils.createTestUser({
				email: "user2@test.com",
				password: "password123",
				firstname: "Bob",
				lastname: "User",
			})

			// Créer une conversation
			const conversation = (await conversationService.createConversation([user1.id, user2.id])) as Conversation & { participants: User[] }

			expect(conversation).toBeDefined()
			expect(conversation.participants).toHaveLength(2)

			// Envoyer des messages privés
			const message1 = await conversationService.pushMessage(conversation.id, user1.id, "Hello from Alice!")
			const message2 = await conversationService.pushMessage(conversation.id, user2.id, "Hello from Bob!")

			expect(message1).toBeDefined()
			expect(message2).toBeDefined()
			expect(message1.senderId).toBe(user1.id)
			expect(message2.senderId).toBe(user2.id)

			// Récupérer les messages de la conversation
			const messages = await conversationService.getMessagesByConversationId(conversation.id)
			expect(messages).toHaveLength(2)
		})

		it("devrait gérer les conversations privées", async () => {
			// Créer des utilisateurs
			const user1 = await testUtils.createTestUser({
				email: "private1@test.com",
				password: "password123",
				firstname: "Private",
				lastname: "User1",
			})

			const user2 = await testUtils.createTestUser({
				email: "private2@test.com",
				password: "password123",
				firstname: "Private",
				lastname: "User2",
			})

			// Créer une conversation privée
			const privateConversation = await conversationService.createConversation([user1.id, user2.id])

			// Envoyer un message privé
			const privateMessage = await conversationService.pushMessage(privateConversation.id, user1.id, "This is a private message")

			expect(privateMessage).toBeDefined()
			expect(privateMessage.content).toBe("This is a private message")
		})
	})

	describe("User Profile Integration", () => {
		it("devrait permettre la mise à jour complète du profil utilisateur", async () => {
			// Créer un utilisateur de base
			const user = await testUtils.createTestUser({
				email: "profile@test.com",
				password: "password123",
				firstname: "Profile",
				lastname: "User",
			})

			// Mettre à jour le profil
			const updatedUser = await userService.update(user.id, {
				bio: "Updated bio",
				nationality: "FR",
				birthdate: new Date("1990-01-01"),
				avatar: "https://example.com/avatar.jpg",
			})

			expect(updatedUser.bio).toBe("Updated bio")
			expect(updatedUser.nationality).toBe("FR")
			expect(updatedUser.avatar).toBe("https://example.com/avatar.jpg")

			// Vérifier que les autres champs restent inchangés
			expect(updatedUser.email).toBe(user.email)
			expect(updatedUser.firstname).toBe(user.firstname)
			expect(updatedUser.lastname).toBe(user.lastname)
		})

		it("devrait gérer les relations d'amitié entre utilisateurs", async () => {
			// Créer des utilisateurs
			const user1 = await testUtils.createTestUser({
				email: "friend1@test.com",
				password: "password123",
				firstname: "Friend",
				lastname: "One",
			})

			const user2 = await testUtils.createTestUser({
				email: "friend2@test.com",
				password: "password123",
				firstname: "Friend",
				lastname: "Two",
			})

			// Créer une demande d'ami
			const friendRequest = await testPrisma.friendRequest.create({
				data: {
					senderId: user1.id,
					receiverId: user2.id,
					status: "PENDING",
				},
			})

			expect(friendRequest).toBeDefined()
			expect(friendRequest.senderId).toBe(user1.id)
			expect(friendRequest.receiverId).toBe(user2.id)
			expect(friendRequest.status).toBe("PENDING")

			// Accepter la demande d'ami
			const acceptedRequest = await testPrisma.friendRequest.update({
				where: { id: friendRequest.id },
				data: { status: "ACCEPTED" },
			})

			expect(acceptedRequest.status).toBe("ACCEPTED")
		})
	})

	describe("Error Handling Integration", () => {
		it("devrait gérer les erreurs de clés étrangères", async () => {
			// Essayer de créer un message avec un utilisateur inexistant
			await expect(
				messageService.create({
					content: "Test message",
					eventId: "non-existent-event-id",
					userId: "non-existent-user-id",
				})
			).rejects.toThrow()
		})
	})
})
