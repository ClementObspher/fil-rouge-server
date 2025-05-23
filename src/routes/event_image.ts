import { Hono } from "hono"
import { EventImageController } from "../controllers/EventImageController"
import { uploadSingle } from "../middleware/upload"

const eventImage = new Hono()
const eventImageController = new EventImageController()

eventImage.get("/", (c) => eventImageController.getAll(c))
eventImage.get("/:id", (c) => eventImageController.getById(c))
eventImage.post("/", uploadSingle("image"), (c) => eventImageController.create(c))
eventImage.put("/:id", uploadSingle("image"), (c) => eventImageController.update(c))
eventImage.delete("/:id", (c) => eventImageController.delete(c))

export default eventImage
