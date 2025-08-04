import { Hono } from "hono"
import { EventController } from "../controllers/EventController"

const event = new Hono()
const eventController = new EventController()

event.get("/", (c) => eventController.getAll(c))
event.get("/types", (c) => eventController.getByTypes(c))
event.get("/user", (c) => eventController.getByUserId(c))
event.get("/participant", (c) => eventController.getByParticipantId(c))
event.get("/:id", (c) => eventController.getById(c))
event.post("/", (c) => eventController.create(c))
event.post("/participate/:id", (c) => eventController.participate(c))
event.post("/unparticipate/:id", (c) => eventController.unParticipate(c))
event.put("/:id", (c) => eventController.update(c))
event.delete("/:id", (c) => eventController.delete(c))

export default event
