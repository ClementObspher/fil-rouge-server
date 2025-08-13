import { Hono } from "hono"
import { PrivateMessageReactionController } from "../controllers/PrivateMessageReactionController"
import { PrivateMessageReactionService } from "../services/PrivateMessageReactionService"
import { PrivateMessageService } from "../services/PrivateMessageService"
import { ConversationService } from "../services/ConversationService"

const privateMessageReaction = new Hono()
const privateMessageReactionService = new PrivateMessageReactionService()
const privateMessageService = new PrivateMessageService()
const conversationService = new ConversationService()
const privateMessageReactionController = new PrivateMessageReactionController(privateMessageReactionService, privateMessageService, conversationService)

privateMessageReaction.get("/", (c) => privateMessageReactionController.getAll(c))
privateMessageReaction.get("/:id", (c) => privateMessageReactionController.getById(c))
privateMessageReaction.get("/message/:id", (c) => privateMessageReactionController.getByMessageId(c))
privateMessageReaction.post("/", (c) => privateMessageReactionController.create(c))
privateMessageReaction.put("/:id", (c) => privateMessageReactionController.update(c))
privateMessageReaction.delete("/:id", (c) => privateMessageReactionController.delete(c))

export default privateMessageReaction
