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

// Routes pour les demandes d'amis
user.post("/:id/friend-requests/send", (c) => userController.sendFriendRequest(c))
user.post("/:id/friend-requests/accept", (c) => userController.acceptFriendRequest(c))
user.post("/:id/friend-requests/decline", (c) => userController.declineFriendRequest(c))
user.post("/:id/friend-requests/cancel", (c) => userController.cancelFriendRequest(c))
user.get("/:id/friend-requests/received", (c) => userController.getPendingFriendRequests(c))
user.get("/:id/friend-requests/sent", (c) => userController.getSentFriendRequests(c))

user.post("/:id/avatar", (c) => userController.updateAvatar(c))

export default user
