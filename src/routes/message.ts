import { Hono } from "hono"
import { MessageController } from "../controllers/MessageController"

const message = new Hono()
const messageController = new MessageController()

message.get("/", (c) => messageController.getAll(c))
message.get("/:id", (c) => messageController.getById(c))
message.get("/event/:id", (c) => messageController.getByEventId(c))
message.post("/", (c) => messageController.create(c))
message.put("/:id", (c) => messageController.update(c))
message.delete("/:id", (c) => messageController.delete(c))

export default message
