import { Hono } from "hono"
import { EventController } from "../controllers/EventController"

const event = new Hono()
const eventController = new EventController()

event.get("/", (c) => eventController.getAll(c))
event.get("/:id", (c) => eventController.getById(c))
event.get("/user/:id", (c) => eventController.getByUserId(c))
event.get("/participant/:id", (c) => eventController.getByParticipantId(c)).post("/", (c) => eventController.create(c))
event.post("/:userId/participate/:id", (c) => eventController.participate(c))
event.post("/:userId/unparticipate/:id", (c) => eventController.unParticipate(c))
event.put("/:id", (c) => eventController.update(c))
event.delete("/:id", (c) => eventController.delete(c))

export default event
