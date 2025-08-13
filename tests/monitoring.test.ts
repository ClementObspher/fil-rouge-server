import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { LoggerService } from "../src/services/LoggerService"
import { MonitoringService } from "../src/services/MonitoringService"
import { PrometheusMetricsService } from "../src/services/PrometheusMetricsService"
import MonitoringController from "../src/controllers/MonitoringController"
import { AuthService } from "../src/services/AuthService"
import { UserService } from "../src/services/UserService"
import { AuthController } from "../src/controllers/AuthController"
import { authMiddleware } from "../src/middleware/auth"
import { testPrisma, testUtils } from "./setup"

describe("Routes monitoring", () => {
	let app: Hono
	let testUser: any
	let authToken: string

	beforeEach(async () => {
		app = new Hono()

		const authService = new AuthService(testPrisma)
		const userService = new UserService(testPrisma)
		const authController = new AuthController(authService, userService)

		const authRoute = new Hono()
		authRoute.post("/login", (c) => authController.login(c))
		authRoute.post("/register", (c) => authController.register(c))

		app.route("/api/auth", authRoute)
		app.use("/api/*", authMiddleware)

		const loggerService = new LoggerService()
		const monitoringService = new MonitoringService()
		const prometheusMetricsService = new PrometheusMetricsService()
		const monitoringController = new MonitoringController(monitoringService, loggerService, prometheusMetricsService)

		const monitoringRoute = new Hono()
		monitoringRoute.get("/dashboard", (c) => monitoringController.getDashboard(c))
		monitoringRoute.get("/health", (c) => monitoringController.getHealth(c))
		monitoringRoute.get("/health/detailed", (c) => monitoringController.getDetailedHealth(c))
		monitoringRoute.get("/metrics", (c) => monitoringController.getMetrics(c))
		monitoringRoute.get("/alerts", (c) => monitoringController.getAlerts(c))
		monitoringRoute.get("/ready", (c) => monitoringController.getReady(c))
		monitoringRoute.get("/live", (c) => monitoringController.getLive(c))
		monitoringRoute.get("/info", (c) => monitoringController.getInfo(c))
		monitoringRoute.get("/logs/summary", (c) => monitoringController.getLogsSummary(c))
		monitoringRoute.get("/logs/all", (c) => monitoringController.getAllLogs(c))
		monitoringRoute.get("/logs/request/:requestId", (c) => monitoringController.getLogsByRequestId(c))
		monitoringRoute.get("/logs/:level", (c) => monitoringController.getLogsByLevel(c))
		monitoringRoute.post("/simulate/:condition", (c) => monitoringController.simulateCondition(c))
		app.route("/monitoring", monitoringRoute)

		testUser = await testUtils.createTestAdmin({
			email: "test@example.com",
			password: "password123",
			firstname: "John",
			lastname: "Doe",
		})

		const loginRes = await app.request("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: testUser.email, password: "password123" }),
		})
		const token = await loginRes.json()
		authToken = token
	})

	describe("GET /monitoring/health", () => {
		it("devrait retourner le statut de santé de l'API", async () => {
			const res = await app.request("/monitoring/health", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("status")
			expect(data).toHaveProperty("timestamp")
			expect(data.status).toBe("healthy")
		})
	})

	describe("GET /monitoring/metrics", () => {
		it("devrait retourner les métriques Prometheus", async () => {
			const res = await app.request("/monitoring/metrics", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.text()
			expect(data).toContain("# HELP")
			expect(data).toContain("# TYPE")
		})
	})

	describe("Format des réponses", () => {
		it("devrait retourner les statistiques au format JSON", async () => {
			const res = await app.request("/monitoring/health", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			expect(res.headers.get("content-type")).toContain("application/json")
			const data = await res.json()
			expect(typeof data).toBe("object")
		})
	})

	describe("GET /monitoring/health/detailed", () => {
		it("devrait retourner les informations de santé détaillées", async () => {
			const res = await app.request("/monitoring/health/detailed", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("status")
			expect(data).toHaveProperty("timestamp")
			expect(data).toHaveProperty("system")
			expect(data).toHaveProperty("endpoints")
			expect(data.status).toBe("healthy")
			expect(data.system).toHaveProperty("nodeVersion")
		})
	})

	describe("GET /monitoring/alerts", () => {
		it("devrait retourner les alertes", async () => {
			const res = await app.request("/monitoring/alerts", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("alertsCount")
			expect(data).toHaveProperty("critical")
			expect(data).toHaveProperty("warning")
			expect(data).toHaveProperty("info")
			expect(data).toHaveProperty("alerts")
			expect(data).toHaveProperty("timestamp")
		})
	})

	describe("GET /monitoring/ready", () => {
		it("devrait retourner le statut de prêt de l'API", async () => {
			const res = await app.request("/monitoring/ready", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("status")
			expect(data).toHaveProperty("timestamp")
			expect(data).toHaveProperty("services")
			expect(data.status).toBe("ready")
			expect(data.services).toHaveProperty("database")
			expect(data.services).toHaveProperty("application")
			expect(data.services.database.status).toBe("healthy")
		})
	})

	describe("GET /monitoring/live", () => {
		it("devrait retourner le statut de vie de l'API", async () => {
			const res = await app.request("/monitoring/live", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("status")
			expect(data).toHaveProperty("timestamp")
			expect(data).toHaveProperty("responseTime")
			expect(data).toHaveProperty("uptime")
			expect(data).toHaveProperty("pid")
			expect(data.status).toBe("alive")
		})
	})

	describe("GET /monitoring/info", () => {
		it("devrait retourner les informations de l'API", async () => {
			const res = await app.request("/monitoring/info", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("name")
			expect(data).toHaveProperty("version")
			expect(data).toHaveProperty("environment")
			expect(data).toHaveProperty("nodeVersion")
			expect(data).toHaveProperty("platform")
			expect(data).toHaveProperty("architecture")
			expect(data).toHaveProperty("startTime")
		})
	})

	describe("GET /monitoring/logs", () => {
		it("devrait retourner les logs de type info", async () => {
			const res = await app.request("/monitoring/logs/info", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("level")
			expect(data).toHaveProperty("count")
			expect(data).toHaveProperty("logs")
			expect(data.level).toBe("info")
			expect(data.logs).toBeInstanceOf(Array)
		})

		it("devrait retourner les logs de type warn", async () => {
			const res = await app.request("/monitoring/logs/warn", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("level")
			expect(data).toHaveProperty("count")
			expect(data).toHaveProperty("logs")
			expect(data.level).toBe("warn")
			expect(data.logs).toBeInstanceOf(Array)
		})

		it("devrait retourner les logs de type error", async () => {
			const res = await app.request("/monitoring/logs/error", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("level")
			expect(data).toHaveProperty("count")
			expect(data).toHaveProperty("logs")
			expect(data.level).toBe("error")
			expect(data.logs).toBeInstanceOf(Array)
		})

		it("devrait retourner les logs de type debug", async () => {
			const res = await app.request("/monitoring/logs/debug", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("level")
			expect(data).toHaveProperty("count")
			expect(data).toHaveProperty("logs")
			expect(data.level).toBe("debug")
			expect(data.logs).toBeInstanceOf(Array)
		})
	})

	describe("GET /monitoring/logs/request/:requestId", () => {
		it("devrait retourner les logs d'une requête spécifique", async () => {
			const res = await app.request("/monitoring/logs/request/1", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("requestId")
			expect(data).toHaveProperty("count")
			expect(data).toHaveProperty("logs")
			expect(data.requestId).toBe("1")
			expect(data.logs).toBeInstanceOf(Array)
		})
	})

	describe("GET /monitoring/logs/summary", () => {
		it("devrait retourner le résumé des logs", async () => {
			const res = await app.request("/monitoring/logs/summary?hours=1", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("period")
			expect(data).toHaveProperty("summary")
			expect(data.period).toBe("1 heures")
			expect(data.summary).toBeInstanceOf(Object)
		})
	})

	describe("GET /monitoring/logs/all", () => {
		it("devrait retourner tous les logs", async () => {
			const res = await app.request("/monitoring/logs/all?lines=100", {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("logs")
			expect(data.logs).toBeInstanceOf(Array)
		})
	})

	describe("POST /monitoring/simulate/:condition", () => {
		it("devrait retourner les alertes", async () => {
			const res = await app.request("/monitoring/simulate/high_memory", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			})
			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveProperty("success")
			expect(data.success).toBe(true)
		})
	})
})
