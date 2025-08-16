import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { prettyJSON } from "hono/pretty-json"
import { swaggerUI } from "@hono/swagger-ui"
import openapi from "./docs/openapi"
import auth from "./routes/auth"
import user from "./routes/user"
import event from "./routes/event"
import eventImage from "./routes/event_image"
import message from "./routes/message"
import messageReaction from "./routes/message_reaction"
import conversation from "./routes/conversation"
import privateMessageReaction from "./routes/private_message_reaction"
import monitoring from "./routes/monitoring"
import anomaly from "./routes/anomaly"
import adminAuth from "./routes/adminAuth"
import { authMiddleware } from "./middleware/auth"
import { monitoringMiddleware, securityMonitoringMiddleware, businessMetricsMiddleware, rateLimitingMiddleware } from "./middleware/monitoring"
import { useApitally } from "apitally/hono"
import AlertService from "./services/AlertService"

const app = new Hono()

// Démarrage du système de monitoring automatique
AlertService.init()

useApitally(app, {
	clientId: "89c964a5-16d6-444e-a86b-0d2610659ad4",
	env: "dev",
	requestLogging: {
		enabled: true,
		logRequestHeaders: true,
		logRequestBody: true,
		logResponseBody: true,
	},
})

// Middleware globaux
app.use("*", cors())
app.use("*", logger())
app.use("*", prettyJSON())

// Middleware de monitoring
app.use("*", monitoringMiddleware)
app.use("*", businessMetricsMiddleware)

// Rate limiting global
app.use("*", rateLimitingMiddleware(100, 60000)) // 100 requêtes par minute

// Documentation Swagger
app.get("/docs", swaggerUI({ url: "/docs/openapi.json" }))
app.route("/docs", openapi)

// Route de base
app.get("/", (c) => {
	return c.json({
		message: "Bienvenue sur l'API Kifekoi",
		version: "1.0.0",
	})
})

// Page de connexion admin (non protégée)
app.get("/admin-login", async (c) => {
	const html = await Bun.file("src/public/admin-login.html").text()
	return c.html(html)
})

// Routes d'authentification admin (non protégées)
app.route("/admin", adminAuth)

// Dashboard de monitoring (authentification côté client)
app.get("/monitoring-dashboard", async (c) => {
	const html = await Bun.file("src/public/monitoring-dashboard.html").text()
	return c.html(html)
})

// Routes de monitoring (non protégées)
app.route("/monitoring", monitoring)

// Routes d'anomalies (protégées par auth admin)
app.route("/api/anomalies", anomaly)

// Routes d'authentification (non protégées) avec monitoring de sécurité
app.use("/api/auth/*", securityMonitoringMiddleware)
app.route("/api/auth", auth)

// Routes protégées
app.use("/api/*", authMiddleware)
app.route("/api/users", user)
app.route("/api/events", event)
app.route("/api/event-images", eventImage)
app.route("/api/messages", message)
app.route("/api/message-reactions", messageReaction)
app.route("/api/conversations", conversation)
app.route("/api/private-message-reactions", privateMessageReaction)

export default {
	port: process.env.PORT || 3001,
	fetch: app.fetch,
}
