import { Hono } from "hono"

const openapi = new Hono()

openapi.get("/openapi.json", (c) => {
	return c.json({
		openapi: "3.0.0",
		info: {
			title: "Kifekoi API",
			version: "1.0.0",
			description: "API de gestion d'évènements",
		},
		paths: {
			"/api/message-reactions": {
				get: { summary: "Lister les réactions", tags: ["Réactions"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
				post: {
					summary: "Créer une réaction",
					tags: ["Réactions"],
					security: [{ bearerAuth: [] }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MessageReaction" } } } },
					responses: {
						"201": { description: "Créé" },
						"400": { $ref: "#/components/responses/ValidationError" },
						"409": { $ref: "#/components/responses/ConflictError" },
					},
				},
			},
			"/api/message-reactions/{id}": {
				get: {
					summary: "Obtenir une réaction",
					tags: ["Réactions"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
				put: {
					summary: "Mettre à jour une réaction",
					tags: ["Réactions"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MessageReaction" } } } },
					responses: { "200": { description: "OK" }, "403": { $ref: "#/components/responses/ForbiddenError" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
				delete: {
					summary: "Supprimer une réaction",
					tags: ["Réactions"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" } },
				},
			},
			"/api/message-reactions/message/{id}": {
				get: {
					summary: "Lister les réactions d'un message",
					tags: ["Réactions"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
			},
			"/api/private-message-reactions": {
				get: { summary: "Lister les réactions privées", tags: ["Réactions privées"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
				post: {
					summary: "Créer une réaction privée",
					tags: ["Réactions privées"],
					security: [{ bearerAuth: [] }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PrivateMessageReaction" } } } },
					responses: { "201": { description: "Créé" } },
				},
			},
			"/api/private-message-reactions/{id}": {
				get: {
					summary: "Obtenir une réaction privée",
					tags: ["Réactions privées"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
				put: {
					summary: "Mettre à jour une réaction privée",
					tags: ["Réactions privées"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PrivateMessageReaction" } } } },
					responses: { "200": { description: "OK" } },
				},
				delete: {
					summary: "Supprimer une réaction privée",
					tags: ["Réactions privées"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" } },
				},
			},
			"/api/private-message-reactions/message/{id}": {
				get: {
					summary: "Lister les réactions d'un message privé",
					tags: ["Réactions privées"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" } },
				},
			},
			"/api/users/friends": {
				get: {
					summary: "Lister mes amis",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/UnauthorizedError" } },
				},
				post: {
					summary: "Ajouter un ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { type: "object", properties: { friendId: { type: "string" } }, required: ["friendId"] } } },
					},
					responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/UnauthorizedError" } },
				},
			},
			"/api/users/friends/{friendId}": {
				delete: {
					summary: "Supprimer un ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "friendId", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/UnauthorizedError" } },
				},
			},
			"/api/users/friend-requests/send": {
				post: {
					summary: "Envoyer une demande d'ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { type: "object", properties: { friendId: { type: "string" } }, required: ["friendId"] } } },
					},
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/users/friend-requests/accept": {
				post: {
					summary: "Accepter une demande d'ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { type: "object", properties: { requestId: { type: "string" } }, required: ["requestId"] } } },
					},
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/users/friend-requests/decline": {
				post: {
					summary: "Refuser une demande d'ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { type: "object", properties: { requestId: { type: "string" } }, required: ["requestId"] } } },
					},
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/users/friend-requests/cancel": {
				post: {
					summary: "Annuler une demande d'ami",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { type: "object", properties: { requestId: { type: "string" } }, required: ["requestId"] } } },
					},
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/users/friend-requests/received": {
				get: { summary: "Demandes d'amis reçues", tags: ["Utilisateurs"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
			},
			"/api/users/friend-requests/sent": {
				get: { summary: "Demandes d'amis envoyées", tags: ["Utilisateurs"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
			},
			"/api/users/avatar": {
				post: {
					summary: "Mettre à jour l'avatar",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"multipart/form-data": {
								schema: {
									type: "object",
									properties: { avatar: { type: "string", format: "binary" } },
									required: ["avatar"],
								},
							},
						},
					},
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/auth/login": {
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
							description: "Connexion réussie (JWT)",
							content: { "application/json": { schema: { type: "string" } } },
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
			"/admin/login": {
				post: {
					summary: "Connexion admin",
					tags: ["Admin"],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
									required: ["email", "password"],
								},
							},
						},
					},
					responses: {
						"200": { description: "OK" },
						"401": { $ref: "#/components/responses/UnauthorizedError" },
						"403": { $ref: "#/components/responses/ForbiddenError" },
					},
				},
			},
			"/admin/verify": {
				post: {
					summary: "Vérifier un token admin",
					tags: ["Admin"],
					requestBody: { required: false },
					responses: {
						"200": { description: "OK" },
						"401": { $ref: "#/components/responses/UnauthorizedError" },
						"403": { $ref: "#/components/responses/ForbiddenError" },
					},
				},
			},
			"/monitoring/health": { get: { summary: "Health", tags: ["Monitoring"], responses: { "200": { description: "OK" } } } },
			"/monitoring/ready": { get: { summary: "Readiness", tags: ["Monitoring"], responses: { "200": { description: "OK" } } } },
			"/monitoring/live": { get: { summary: "Liveness", tags: ["Monitoring"], responses: { "200": { description: "OK" } } } },
			"/monitoring/metrics": {
				get: {
					summary: "Métriques Prometheus (admin)",
					tags: ["Monitoring"],
					security: [{ bearerAuth: [] }],
					responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/UnauthorizedError" } },
				},
			},
			"/monitoring/dashboard": {
				get: {
					summary: "Dashboard (admin)",
					tags: ["Monitoring"],
					security: [{ bearerAuth: [] }],
					responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/UnauthorizedError" } },
				},
			},
			"/api/auth/register": {
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
										confirmPassword: { type: "string" },
										firstname: { type: "string" },
										lastname: { type: "string" },
										bio: { type: "string", nullable: true },
										nationality: { type: "string", nullable: true },
										birthdate: { type: "string", format: "date-time", nullable: true },
										avatar: { type: "string", description: "Base64 data URL optionnelle" },
									},
									required: ["email", "password", "confirmPassword", "firstname", "lastname"],
								},
							},
						},
					},
					responses: {
						"201": { description: "Utilisateur créé avec succès", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
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
			"/api/users": {
				get: {
					summary: "Récupérer tous les utilisateurs",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
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
						"500": {
							$ref: "#/components/responses/InternalServerError",
						},
					},
				},
				post: {
					summary: "Créer un utilisateur",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
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
				put: {
					summary: "Mettre à jour l'utilisateur courant",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					requestBody: {
						required: true,
						content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
					},
					responses: {
						"200": { description: "Utilisateur mis à jour" },
						"400": { $ref: "#/components/responses/ValidationError" },
						"401": { $ref: "#/components/responses/UnauthorizedError" },
						"500": { $ref: "#/components/responses/InternalServerError" },
					},
				},
				delete: {
					summary: "Supprimer l'utilisateur courant",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
					responses: {
						"200": { description: "Utilisateur supprimé" },
						"401": { $ref: "#/components/responses/UnauthorizedError" },
						"500": { $ref: "#/components/responses/InternalServerError" },
					},
				},
			},
			"/api/users/{id}": {
				get: {
					summary: "Récupérer un utilisateur par ID",
					tags: ["Utilisateurs"],
					security: [{ bearerAuth: [] }],
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
			},
			"/api/messages": {
				get: {
					summary: "Récupérer tous les messages",
					tags: ["Messages"],
					security: [{ bearerAuth: [] }],
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
					security: [{ bearerAuth: [] }],
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
			"/api/messages/{id}": {
				get: {
					summary: "Récupérer un message par ID",
					tags: ["Messages"],
					security: [{ bearerAuth: [] }],
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
				put: {
					summary: "Mettre à jour un message",
					tags: ["Messages"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Message" } } } },
					responses: {
						"200": { description: "OK" },
						"400": { $ref: "#/components/responses/ValidationError" },
						"403": { $ref: "#/components/responses/ForbiddenError" },
						"404": { $ref: "#/components/responses/NotFoundError" },
					},
				},
				delete: {
					summary: "Supprimer un message",
					tags: ["Messages"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "403": { $ref: "#/components/responses/ForbiddenError" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
			},
			"/api/messages/event/{id}": {
				get: {
					summary: "Récupérer les messages d'un événement",
					tags: ["Messages"],
					security: [{ bearerAuth: [] }],
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
			"/api/events": {
				get: {
					summary: "Lister les événements",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					responses: { "200": { description: "OK" } },
				},
				post: {
					summary: "Créer un événement",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
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
			"/api/events/types": {
				get: {
					summary: "Lister par types",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "types", in: "query", required: true, schema: { type: "string", example: "SPORTS,MUSIC" } }],
					responses: { "200": { description: "OK" }, "400": { $ref: "#/components/responses/ValidationError" } },
				},
			},
			"/api/events/user": {
				get: { summary: "Événements par utilisateur courant", tags: ["Événements"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
			},
			"/api/events/participant": {
				get: { summary: "Événements où je participe", tags: ["Événements"], security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
			},
			"/api/events/participate/{id}": {
				post: {
					summary: "Participer à un événement",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "403": { $ref: "#/components/responses/ForbiddenError" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
			},
			"/api/events/unparticipate/{id}": {
				post: {
					summary: "Se désinscrire d'un événement",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "404": { $ref: "#/components/responses/NotFoundError" }, "403": { $ref: "#/components/responses/ForbiddenError" } },
				},
			},
			"/api/events/{id}": {
				get: {
					summary: "Récupérer un événement par ID",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
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
				put: {
					summary: "Mettre à jour un événement",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } },
					responses: { "200": { description: "OK" }, "403": { $ref: "#/components/responses/ForbiddenError" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
				delete: {
					summary: "Supprimer un événement",
					tags: ["Événements"],
					security: [{ bearerAuth: [] }],
					parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
					responses: { "200": { description: "OK" }, "403": { $ref: "#/components/responses/ForbiddenError" }, "404": { $ref: "#/components/responses/NotFoundError" } },
				},
			},
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						email: { type: "string", format: "email" },
						password: { type: "string" },
						firstname: { type: "string" },
						lastname: { type: "string" },
						bio: { type: "string", nullable: true },
						birthdate: { type: "string", format: "date-time", nullable: true },
						nationality: { type: "string", nullable: true },
						role: { type: "string", enum: ["ADMIN", "USER"] },
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
						userId: { type: "string", format: "uuid" },
						content: { type: "string" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				MessageReaction: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						messageId: { type: "string", format: "uuid" },
						userId: { type: "string", format: "uuid" },
						type: { type: "string" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				PrivateMessageReaction: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
						messageId: { type: "string", format: "uuid" },
						userId: { type: "string", format: "uuid" },
						type: { type: "string" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Conversation: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
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
