import { ConversationController } from "../controllers/ConversationController"
import { Hono } from "hono"

const conversation = new Hono()
const conversationController = new ConversationController()

conversation.get("/", (c) => conversationController.getConversationsByUserIds(c))
conversation.get("/:id", (c) => conversationController.getConversationById(c))
conversation.get("/:id/messages", (c) => conversationController.getMessagesByConversationId(c))
conversation.post("/", (c) => conversationController.createConversation(c))
conversation.post("/:id/messages", (c) => conversationController.pushMessage(c))
conversation.put("/messages/:messageId", (c) => conversationController.updateMessage(c))

export default conversation
