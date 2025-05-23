import { Hono } from "hono"
import { UserController } from "../controllers/UserController"

const user = new Hono()
const userController = new UserController()

user.get("/", (c) => userController.getAll(c))
user.get("/:id", (c) => userController.getById(c))
user.post("/", (c) => userController.create(c))
user.put("/:id", (c) => userController.update(c))
user.delete("/:id", (c) => userController.delete(c))
user.post("/:id/friends", (c) => userController.addFriend(c))
user.get("/:id/friends", (c) => userController.getFriends(c))
user.delete("/:id/friends/:friendId", (c) => userController.removeFriend(c))
user.post("/:id/avatar", (c) => userController.updateAvatar(c))

export default user
