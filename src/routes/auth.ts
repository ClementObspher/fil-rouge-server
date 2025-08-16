import { Hono } from "hono"
import { AuthController } from "../controllers/AuthController"
import { bruteForceProtectionMiddleware } from "../middleware/monitoring"

const auth = new Hono()
const authController = new AuthController()

auth.use("/*", bruteForceProtectionMiddleware)

auth.post("/login", (c) => authController.login(c))
auth.post("/register", (c) => authController.register(c))

export default auth
