import { Hono } from "hono"

const openapi = new Hono()

openapi.get("/openapi.json", (c) => {
	return c.json({
		openapi: "3.0.0",
		info: {
			title: "API",
			version: "1.0.0",
			description: "API de gestion d'événements et de messages",
		},
		paths: {
			"/auth/login": {
				post: {
					summary: "Connexion utilisateur",
					tags: ["Authentification"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										email: { type: "string", format: "email" },
										password: { type: "string" },
									},
									required: ["email", "password"],
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Connexion réussie",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											token: { type: "string" },
										},
									},
								},
							},
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/auth/register": {
				post: {
					summary: "Inscription utilisateur",
					tags: ["Authentification"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										email: { type: "string", format: "email" },
										password: { type: "string" },
										name: { type: "string" },
									},
									required: ["email", "password", "name"],
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Utilisateur créé avec succès",
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"409": {
							$ref: "#/components/responses/ConflictError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/users": {
				get: {
					summary: "Récupérer tous les utilisateurs",
					tags: ["Utilisateurs"],
					responses: {
						"200": {
							description: "Liste des utilisateurs",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: {
											$ref: "#/components/schemas/User",
										},
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"403": {
							$ref: "#/components/responses/ForbiddenError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
				post: {
					summary: "Créer un utilisateur",
					tags: ["Utilisateurs"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/User",
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Utilisateur créé",
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"409": {
							$ref: "#/components/responses/ConflictError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/users/{id}": {
				get: {
					summary: "Récupérer un utilisateur par ID",
					tags: ["Utilisateurs"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					responses: {
						"200": {
							description: "Utilisateur trouvé",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/User",
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"403": {
							$ref: "#/components/responses/ForbiddenError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
				put: {
					summary: "Mettre à jour un utilisateur",
					tags: ["Utilisateurs"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/User",
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Utilisateur mis à jour",
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"403": {
							$ref: "#/components/responses/ForbiddenError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
				delete: {
					summary: "Supprimer un utilisateur",
					tags: ["Utilisateurs"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					responses: {
						"204": {
							description: "Utilisateur supprimé",
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"403": {
							$ref: "#/components/responses/ForbiddenError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/messages": {
				get: {
					summary: "Récupérer tous les messages",
					tags: ["Messages"],
					responses: {
						"200": {
							description: "Liste des messages",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: {
											$ref: "#/components/schemas/Message",
										},
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
				post: {
					summary: "Créer un message",
					tags: ["Messages"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/Message",
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Message créé",
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/messages/{id}": {
				get: {
					summary: "Récupérer un message par ID",
					tags: ["Messages"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					responses: {
						"200": {
							description: "Message trouvé",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/Message",
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/messages/event/{id}": {
				get: {
					summary: "Récupérer les messages d'un événement",
					tags: ["Messages"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					responses: {
						"200": {
							description: "Liste des messages de l'événement",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: {
											$ref: "#/components/schemas/Message",
										},
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/events": {
				post: {
					summary: "Créer un événement",
					tags: ["Événements"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/Event",
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Événement créé",
						},
						"400": {
							$ref: "#/components/responses/ValidationError",
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
			"/events/{id}": {
				get: {
					summary: "Récupérer un événement par ID",
					tags: ["Événements"],
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: {
								type: "string",
							},
						},
					],
					responses: {
						"200": {
							description: "Événement trouvé",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/Event",
									},
								},
							},
						},
						"401": {
							$ref: "#/components/responses/UnauthorizedError",
						},
						"404": {
							$ref: "#/components/responses/NotFoundError",
						},
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
			},
		},
		components: {
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						email: { type: "string", format: "email" },
						password: { type: "string" },
						name: { type: "string" },
						role: {
							type: "string",
							enum: ["ADMIN", "USER"],
						},
						avatar: { type: "string", nullable: true },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Event: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						slug: { type: "string" },
						isPublic: { type: "boolean", default: false },
						isFeatured: { type: "boolean", default: false },
						isArchived: { type: "boolean", default: false },
						isCancelled: { type: "boolean", default: false },
						isDraft: { type: "boolean", default: false },
						isPublished: { type: "boolean", default: false },
						isUnlisted: { type: "boolean", default: false },
						isPrivate: { type: "boolean", default: false },
						coverImage: { type: "string", nullable: true },
						title: { type: "string" },
						description: { type: "string", nullable: true },
						address: { type: "string", nullable: true },
						startDate: { type: "string", format: "date-time" },
						endDate: { type: "string", format: "date-time" },
						longitude: { type: "number", format: "float" },
						latitude: { type: "number", format: "float" },
						status: {
							type: "string",
							enum: ["PENDING", "CONFIRMED", "CANCELLED"],
						},
						type: {
							type: "string",
							enum: ["MUSIC", "DANCE", "THEATRE", "VISUAL_ART", "LITERATURE", "CINEMA", "SPORTS", "OTHER"],
						},
						ownerId: { type: "string", format: "uuid" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				EventImage: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						eventId: { type: "string", format: "uuid" },
						url: { type: "string" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Message: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						eventId: { type: "string", format: "uuid" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				MessageReaction: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						messageId: { type: "string", format: "uuid" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Error: {
					type: "object",
					properties: {
						error: { type: "string" },
						message: { type: "string" },
						statusCode: { type: "integer" },
					},
				},
				ValidationError: {
					type: "object",
					properties: {
						error: { type: "string" },
						message: { type: "string" },
						statusCode: { type: "integer" },
						errors: {
							type: "array",
							items: {
								type: "object",
								properties: {
									field: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
			},
			responses: {
				UnauthorizedError: {
					description: "Non authentifié",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
				ForbiddenError: {
					description: "Accès refusé",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
				NotFoundError: {
					description: "Ressource non trouvée",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
				ValidationError: {
					description: "Erreur de validation",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/ValidationError",
							},
						},
					},
				},
				ConflictError: {
					description: "Conflit de ressources",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
				InternalServerError: {
					description: "Erreur interne du serveur",
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/Error",
							},
						},
					},
				},
			},
		},
	})
})

export default openapi
