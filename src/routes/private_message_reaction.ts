import { Hono } from "hono"
import { PrivateMessageReactionController } from "../controllers/PrivateMessageReactionController"

const privateMessageReaction = new Hono()
const privateMessageReactionController = new PrivateMessageReactionController()

privateMessageReaction.get("/", (c) => privateMessageReactionController.getAll(c))
privateMessageReaction.get("/:id", (c) => privateMessageReactionController.getById(c))
privateMessageReaction.get("/message/:id", (c) => privateMessageReactionController.getByMessageId(c))
privateMessageReaction.post("/", (c) => privateMessageReactionController.create(c))
privateMessageReaction.put("/:id", (c) => privateMessageReactionController.update(c))
privateMessageReaction.delete("/:id", (c) => privateMessageReactionController.delete(c))

export default privateMessageReaction
