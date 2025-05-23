import { Hono } from "hono"
import { MessageReactionController } from "../controllers/MessageReactionController"

const messageReaction = new Hono()
const messageReactionController = new MessageReactionController()

messageReaction.get("/", (c) => messageReactionController.getAll(c))
messageReaction.get("/:id", (c) => messageReactionController.getById(c))
messageReaction.get("/message/:id", (c) => messageReactionController.getByMessageId(c))
messageReaction.post("/", (c) => messageReactionController.create(c))
messageReaction.put("/:id", (c) => messageReactionController.update(c))
messageReaction.delete("/:id", (c) => messageReactionController.delete(c))

export default messageReaction
