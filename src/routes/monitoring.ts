import { Hono } from "hono"
import MonitoringController from "../controllers/MonitoringController"
import { adminAuthMiddleware } from "../middleware/adminAuth"
import { MonitoringService } from "../services/MonitoringService"
import { LoggerService } from "../services/LoggerService"
import { PrometheusMetricsService } from "../services/PrometheusMetricsService"

const monitoring = new Hono()

const monitoringService = new MonitoringService()
const loggerService = new LoggerService()
const prometheusMetricsService = new PrometheusMetricsService()

const monitoringController = new MonitoringController(monitoringService, loggerService, prometheusMetricsService)

const publicRoutes = new Hono()
publicRoutes.get("/health", (c) => monitoringController.getHealth(c))
publicRoutes.get("/ready", (c) => monitoringController.getReady(c))
publicRoutes.get("/live", (c) => monitoringController.getLive(c))

const protectedRoutes = new Hono()
protectedRoutes.use("*", adminAuthMiddleware)
protectedRoutes.get("/dashboard", (c) => monitoringController.getDashboard(c))
protectedRoutes.get("/health/detailed", (c) => monitoringController.getDetailedHealth(c))
protectedRoutes.get("/metrics", (c) => monitoringController.getMetrics(c))
protectedRoutes.get("/alerts", (c) => monitoringController.getAlerts(c))
protectedRoutes.get("/info", (c) => monitoringController.getInfo(c))
protectedRoutes.get("/logs/summary", (c) => monitoringController.getLogsSummary(c))
protectedRoutes.get("/logs/all", (c) => monitoringController.getAllLogs(c))
protectedRoutes.get("/logs/request/:requestId", (c) => monitoringController.getLogsByRequestId(c))
protectedRoutes.get("/logs/:level", (c) => monitoringController.getLogsByLevel(c))
protectedRoutes.post("/simulate/:condition", (c) => monitoringController.simulateCondition(c))

monitoring.route("/", publicRoutes)
monitoring.route("/", protectedRoutes)

export default monitoring
