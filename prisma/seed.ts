import { PrismaClient, Role, EventStatus, EventType } from "@prisma/client"
import * as bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
	// Nettoyage de la base de données
	await prisma.messageReaction.deleteMany()
	await prisma.message.deleteMany()
	await prisma.eventImage.deleteMany()
	await prisma.event.deleteMany()
	await prisma.user.deleteMany()

	// Création des utilisateurs
	const adminPassword = await bcrypt.hash("admin123", 10)
	const userPassword = await bcrypt.hash("user123", 10)

	const admin = await prisma.user.create({
		data: {
			email: "admin@example.com",
			password: adminPassword,
			name: "Admin User",
			role: Role.ADMIN,
			avatar: "https://example.com/admin-avatar.jpg",
		},
	})

	const user1 = await prisma.user.create({
		data: {
			email: "user1@example.com",
			password: userPassword,
			name: "John Doe",
			role: Role.USER,
			avatar: "https://example.com/user1-avatar.jpg",
		},
	})

	const user2 = await prisma.user.create({
		data: {
			email: "user2@example.com",
			password: userPassword,
			name: "Jane Smith",
			role: Role.USER,
			avatar: "https://example.com/user2-avatar.jpg",
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
			longitude: 2.3522,
			latitude: 48.8566,
			status: EventStatus.CONFIRMED,
			type: EventType.MUSIC,
			isPublic: true,
			isFeatured: true,
			coverImage: "https://example.com/concert-cover.jpg",
			ownerId: admin.id,
		},
	})

	const event2 = await prisma.event.create({
		data: {
			slug: "exposition-art-moderne",
			title: "Exposition Art Moderne",
			description: "Une exposition d'art moderne exceptionnelle",
			startDate: new Date("2024-07-01T10:00:00Z"),
			endDate: new Date("2024-07-15T18:00:00Z"),
			longitude: 2.3522,
			latitude: 48.8566,
			status: EventStatus.PENDING,
			type: EventType.VISUAL_ART,
			isPublic: true,
			coverImage: "https://example.com/exposition-cover.jpg",
			ownerId: user1.id,
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
		},
	})

	const message2 = await prisma.message.create({
		data: {
			eventId: event2.id,
		},
	})

	// Création des réactions aux messages
	await prisma.messageReaction.createMany({
		data: [
			{
				messageId: message1.id,
			},
			{
				messageId: message2.id,
			},
		],
	})

	// Ajout d'amis
	await prisma.user.update({
		where: { id: user1.id },
		data: {
			friends: {
				connect: [{ id: user2.id }],
			},
		},
	})

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
