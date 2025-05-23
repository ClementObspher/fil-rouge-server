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
import { authMiddleware } from "./middleware/auth"

const app = new Hono()

// Middleware globaux
app.use("*", cors())
app.use("*", logger())
app.use("*", prettyJSON())

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

// Routes d'authentification (non protégées)
app.route("/api/auth", auth)

// Routes protégées
app.use("*", authMiddleware)
app.route("/api/users", user)
app.route("/api/events", event)
app.route("/api/event-images", eventImage)
app.route("/api/messages", message)
app.route("/api/message-reactions", messageReaction)

export default {
	port: process.env.PORT || 3001,
	fetch: app.fetch,
}
