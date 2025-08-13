import { PrismaClient, Role, EventStatus, EventType, FriendRequestStatus, MessageReactionType } from "@prisma/client"
import * as bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
	// Nettoyage de la base de données (dans l'ordre pour éviter les contraintes de clé étrangère)
	await prisma.privateMessageReaction.deleteMany()
	await prisma.privateMessage.deleteMany()
	await prisma.conversation.deleteMany()
	await prisma.messageReaction.deleteMany()
	await prisma.message.deleteMany()
	await prisma.eventImage.deleteMany()
	await prisma.event.deleteMany()
	await prisma.address.deleteMany()
	await prisma.friendRequest.deleteMany()
	await prisma.user.deleteMany()

	// Création des utilisateurs
	const adminPassword = await bcrypt.hash("password", 10)
	const userPassword = await bcrypt.hash("password", 10)

	const admin = await prisma.user.create({
		data: {
			email: "admin@example.com",
			password: adminPassword,
			firstname: "Admin",
			lastname: "User",
			bio: "Administrateur de la plateforme",
			birthdate: new Date("1990-01-01"),
			nationality: "FR",
			role: Role.ADMIN,
			avatar: "https://github.com/shadcn.png",
		},
	})

	const user1 = await prisma.user.create({
		data: {
			email: "user1@example.com",
			password: userPassword,
			firstname: "John",
			lastname: "Doe",
			bio: "Passionné de musique et d'événements culturels",
			birthdate: new Date("1995-05-15"),
			nationality: "FR",
			role: Role.USER,
			avatar: "https://github.com/shadcn.png",
		},
	})

	const user2 = await prisma.user.create({
		data: {
			email: "user2@example.com",
			password: userPassword,
			firstname: "Jane",
			lastname: "Smith",
			bio: "Artiste et organisatrice d'expositions",
			birthdate: new Date("1988-12-03"),
			nationality: "FR",
			role: Role.USER,
			avatar: "https://github.com/shadcn.png",
		},
	})

	// Création des adresses
	const address1 = await prisma.address.create({
		data: {
			number: "123",
			street: "Avenue des Champs-Élysées",
			city: "Paris",
			postal_code: "75008",
			country: "France",
			longitude: 2.3522,
			latitude: 48.8566,
		},
	})

	const address2 = await prisma.address.create({
		data: {
			number: "45",
			street: "Rue de Rivoli",
			city: "Paris",
			postal_code: "75004",
			country: "France",
			longitude: 2.3522,
			latitude: 48.8566,
		},
	})

	// Création des événements
	const event1 = await prisma.event.create({
		data: {
			slug: "concert-rock-2024",
			title: "Concert Rock 2024",
			description: "Un grand concert rock avec les meilleurs artistes",
			startDate: new Date("2024-06-15T19:00:00Z"),
			endDate: new Date("2024-06-15T23:00:00Z"),
			status: EventStatus.CONFIRMED,
			type: EventType.MUSIC,
			isPublic: true,
			isFeatured: true,
			coverImage: "http://localhost:9000/images/ddc2afed-be90-4a4d-aa80-64506ed1e83d-9bc52893-f7be-410b-b306-0cec3ec688a6-cover.jpg",
			ownerId: admin.id,
			addressId: address1.id,
		},
	})

	const event2 = await prisma.event.create({
		data: {
			slug: "exposition-art-moderne",
			title: "Exposition Art Moderne",
			description: "Une exposition d'art moderne exceptionnelle",
			startDate: new Date("2024-07-01T10:00:00Z"),
			endDate: new Date("2024-07-15T18:00:00Z"),
			status: EventStatus.PENDING,
			type: EventType.VISUAL_ART,
			isPublic: true,
			coverImage: "http://localhost:9000/images/ddc2afed-be90-4a4d-aa80-64506ed1e83d-9bc52893-f7be-410b-b306-0cec3ec688a6-cover.jpg",
			ownerId: user1.id,
			addressId: address2.id,
		},
	})

	// Création des images d'événements
	await prisma.eventImage.createMany({
		data: [
			{
				eventId: event1.id,
				url: "https://example.com/concert-image1.jpg",
			},
			{
				eventId: event1.id,
				url: "https://example.com/concert-image2.jpg",
			},
			{
				eventId: event2.id,
				url: "https://example.com/exposition-image1.jpg",
			},
		],
	})

	// Création des messages
	const message1 = await prisma.message.create({
		data: {
			eventId: event1.id,
			userId: admin.id,
			content: "Bonjour, je suis l'administrateur de l'événement",
		},
	})

	const message2 = await prisma.message.create({
		data: {
			eventId: event2.id,
			userId: user1.id,
			content: "Bonjour, je suis l'utilisateur 1 de l'événement",
		},
	})

	// Création des réactions aux messages
	await prisma.messageReaction.createMany({
		data: [
			{
				messageId: message1.id,
				userId: admin.id,
				type: MessageReactionType.LIKE,
			},
			{
				messageId: message2.id,
				userId: user1.id,
				type: MessageReactionType.LOVE,
			},
		],
	})

	// Création des demandes d'amis pour les tests
	// await prisma.friendRequest.createMany({
	// 	data: [
	// 		{
	// 			senderId: user1.id,
	// 			receiverId: user2.id,
	// 			status: FriendRequestStatus.PENDING,
	// 		},
	// 		{
	// 			senderId: user2.id,
	// 			receiverId: admin.id,
	// 			status: FriendRequestStatus.PENDING,
	// 		},
	// 		{
	// 			senderId: admin.id,
	// 			receiverId: user1.id,
	// 			status: FriendRequestStatus.ACCEPTED,
	// 		},
	// 	],
	// })

	// // Ajouter une relation d'amitié correspondante à la demande acceptée
	// await prisma.user.update({
	// 	where: { id: admin.id },
	// 	data: {
	// 		User_A: { connect: { id: user1.id } },
	// 	},
	// })

	// await prisma.user.update({
	// 	where: { id: user1.id },
	// 	data: {
	// 		User_A: { connect: { id: admin.id } },
	// 	},
	// })

	console.log("Données de test créées avec succès !")
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
