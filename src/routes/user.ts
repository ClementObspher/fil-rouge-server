import { Hono } from "hono"
import { UserController } from "../controllers/UserController"
import { UserService } from "../services/UserService"
import { uploadSingle } from "../middleware/upload"

const user = new Hono()
const userService = new UserService()
const userController = new UserController(userService)

user.get("/", (c) => userController.getAll(c))

// Routes spécifiques AVANT les routes avec paramètres
user.get("/friends", (c) => userController.getFriends(c))
user.post("/friends", (c) => userController.addFriend(c))
user.delete("/friends/:friendId", (c) => userController.removeFriend(c))

// Routes pour les demandes d'amis
user.post("/friend-requests/send", (c) => userController.sendFriendRequest(c))
user.post("/friend-requests/accept", (c) => userController.acceptFriendRequest(c))
user.post("/friend-requests/decline", (c) => userController.declineFriendRequest(c))
user.post("/friend-requests/cancel", (c) => userController.cancelFriendRequest(c))
user.get("/friend-requests/received", (c) => userController.getPendingFriendRequests(c))
user.get("/friend-requests/sent", (c) => userController.getSentFriendRequests(c))

user.post("/avatar", uploadSingle("avatar"), (c) => userController.updateAvatar(c))

// Route générique avec paramètre /:id EN DERNIER
user.get("/:id", (c) => userController.getById(c))

user.post("/", (c) => userController.create(c))
user.put("/", (c) => userController.update(c))
user.delete("/", (c) => userController.delete(c))

export default user
