import { Context } from "hono"
import { readFileSync } from "fs"
import { join } from "path"
import { MonitoringService } from "../services/MonitoringService"
import { LoggerService } from "../services/LoggerService"
import { PrometheusMetricsService } from "../services/PrometheusMetricsService"

export default class MonitoringController {
	private monitoringService: MonitoringService
	private loggerService: LoggerService
	private prometheusMetricsService: PrometheusMetricsService

	constructor(monitoringService?: MonitoringService, loggerService?: LoggerService, prometheusMetricsService?: PrometheusMetricsService) {
		this.monitoringService = monitoringService || new MonitoringService()
		this.loggerService = loggerService || new LoggerService()
		this.prometheusMetricsService = prometheusMetricsService || new PrometheusMetricsService()
	}

	async getDashboard(c: Context) {
		try {
			const dashboardPath = join(process.cwd(), "src", "public", "monitoring-dashboard.html")
			const dashboardHTML = readFileSync(dashboardPath, "utf-8")
			return c.html(dashboardHTML)
		} catch (error) {
			return c.html(
				`
      <h1>Dashboard de Monitoring</h1>
      <p>Erreur lors du chargement du dashboard: ${error instanceof Error ? error.message : "Erreur inconnue"}</p>
      <p><a href="/monitoring/health">Health Check</a> | <a href="/monitoring/metrics">Métriques</a></p>
    `,
				500
			)
		}
	}

	async getHealth(c: Context) {
		try {
			const healthStatus = await this.monitoringService.getHealthStatus()

			const statusCode = healthStatus.status === "unhealthy" ? 503 : healthStatus.status === "degraded" ? 200 : 200

			return c.json(healthStatus, statusCode)
		} catch (error) {
			console.error("Erreur lors du health check:", error)
			return c.json(
				{
					status: "unhealthy",
					timestamp: new Date().toISOString(),
					error: "Health check failed",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				503
			)
		}
	}

	async getDetailedHealth(c: Context) {
		try {
			const healthStatus = await this.monitoringService.getHealthStatus()

			const detailedStatus = {
				...healthStatus,
				system: {
					nodeVersion: process.version,
					platform: process.platform,
					arch: process.arch,
					pid: process.pid,
					env: process.env.NODE_ENV || "development",
					memory: process.memoryUsage(),
					uptime: process.uptime(),
				},
				endpoints: {
					health: "/monitoring/health",
					metrics: "/monitoring/metrics",
					alerts: "/monitoring/alerts",
					ready: "/monitoring/ready",
					live: "/monitoring/live",
				},
			}

			return c.json(detailedStatus)
		} catch (error) {
			console.error("Erreur lors du health check détaillé:", error)
			return c.json(
				{
					status: "unhealthy",
					timestamp: new Date().toISOString(),
					error: "Detailed health check failed",
				},
				503
			)
		}
	}

	async getMetrics(c: Context) {
		try {
			const healthStatus = await this.monitoringService.getHealthStatus()

			this.prometheusMetricsService.updateMetrics(healthStatus)

			const prometheusMetrics = await this.prometheusMetricsService.getMetrics()

			return c.text(prometheusMetrics, 200, {
				"Content-Type": "text/plain; version=0.0.4; charset=utf-8",
			})
		} catch (error) {
			console.error("Erreur lors de la génération des métriques:", error)
			return c.text("# Error generating metrics", 500)
		}
	}

	async getAlerts(c: Context) {
		try {
			const alerts = await this.monitoringService.checkThresholds()

			return c.json({
				alertsCount: alerts.length,
				critical: alerts.filter((a) => a.type === "critical").length,
				warning: alerts.filter((a) => a.type === "warning").length,
				info: alerts.filter((a) => a.type === "info").length,
				alerts: alerts,
				timestamp: new Date().toISOString(),
			})
		} catch (error) {
			console.error("Erreur lors de la récupération des alertes:", error)
			return c.json(
				{
					error: "Failed to retrieve alerts",
					timestamp: new Date().toISOString(),
				},
				500
			)
		}
	}

	async getReady(c: Context) {
		try {
			const healthStatus = await this.monitoringService.getHealthStatus()

			const isReady = healthStatus.services.database.status !== "unhealthy" && healthStatus.services.application.status !== "unhealthy"

			if (isReady) {
				return c.json({
					status: "ready",
					timestamp: new Date().toISOString(),
					services: healthStatus.services,
				})
			} else {
				return c.json(
					{
						status: "not_ready",
						timestamp: new Date().toISOString(),
						services: healthStatus.services,
						reason: "Critical services are unhealthy",
					},
					503
				)
			}
		} catch (error) {
			return c.json(
				{
					status: "not_ready",
					timestamp: new Date().toISOString(),
					error: "Readiness check failed",
				},
				503
			)
		}
	}

	async getLive(c: Context) {
		try {
			const startTime = Date.now()

			const responseTime = Date.now() - startTime

			return c.json({
				status: "alive",
				timestamp: new Date().toISOString(),
				responseTime,
				uptime: process.uptime(),
				pid: process.pid,
			})
		} catch (error) {
			return c.json(
				{
					status: "dead",
					timestamp: new Date().toISOString(),
					error: "Liveness check failed",
				},
				503
			)
		}
	}

	async getInfo(c: Context) {
		return c.json({
			name: "fil-rouge-server",
			version: process.env.APP_VERSION || "1.0.0",
			environment: process.env.NODE_ENV || "development",
			nodeVersion: process.version,
			platform: process.platform,
			architecture: process.arch,
			startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
			uptime: process.uptime(),
			endpoints: {
				api: "http://localhost:3001/api",
				docs: "http://localhost:3001/docs",
				monitoring: "http://localhost:3001/monitoring",
			},
			features: ["authentication", "events", "messages", "file-upload", "monitoring"],
		})
	}

	async getLogsByLevel(c: Context) {
		try {
			const level = c.req.param("level") as "info" | "warn" | "error" | "debug"
			const lines = parseInt(c.req.query("lines") || "100")

			if (!["info", "warn", "error", "debug"].includes(level)) {
				return c.json({ error: "Niveau de log invalide. Utilisez: info, warn, error, debug" }, 400)
			}

			const logs = this.loggerService.getRecentLogs(level, lines)
			const parsedLogs = logs.map((line) => {
				try {
					return JSON.parse(line)
				} catch {
					return { raw: line }
				}
			})

			return c.json({
				level,
				count: parsedLogs.length,
				logs: parsedLogs,
			})
		} catch (error) {
			return c.json(
				{
					error: "Erreur lors de la récupération des logs",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500
			)
		}
	}

	async getLogsByRequestId(c: Context) {
		try {
			const requestId = c.req.param("requestId")
			const logs = this.loggerService.findLogsByRequestId(requestId)

			return c.json({
				requestId,
				count: logs.length,
				logs,
			})
		} catch (error) {
			return c.json(
				{
					error: "Erreur lors de la recherche des logs",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500
			)
		}
	}

	async getLogsSummary(c: Context) {
		try {
			const hours = parseInt(c.req.query("hours") || "24")
			const summary = this.loggerService.getLogsSummary(hours)

			return c.json({
				period: `${hours} heures`,
				summary,
			})
		} catch (error) {
			return c.json(
				{
					error: "Erreur lors de la génération du résumé",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500
			)
		}
	}

	async getAllLogs(c: Context) {
		try {
			const lines = parseInt(c.req.query("lines") || "50")

			const allLogs = [
				...this.loggerService.getRecentLogs("error", lines),
				...this.loggerService.getRecentLogs("warn", lines),
				...this.loggerService.getRecentLogs("info", lines),
				...this.loggerService.getRecentLogs("debug", lines),
			]

			const parsedLogs = allLogs
				.map((line) => {
					try {
						return JSON.parse(line)
					} catch {
						return { raw: line }
					}
				})
				.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())

			return c.json({
				count: parsedLogs.length,
				logs: parsedLogs.slice(0, lines),
			})
		} catch (error) {
			return c.json(
				{
					error: "Erreur lors de la récupération des logs",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500
			)
		}
	}

	async simulateCondition(c: Context) {
		try {
			const condition = c.req.param("condition") as "high_memory" | "slow_response" | "high_errors" | "disk_full" | "db_overload"

			if (!["high_memory", "slow_response", "high_errors", "disk_full", "db_overload"].includes(condition)) {
				return c.json(
					{
						error: "Condition invalide",
						available: ["high_memory", "slow_response", "high_errors", "disk_full", "db_overload"],
						examples: {
							high_memory: "Simule une utilisation mémoire critique > 85%",
							slow_response: "Simule des temps de réponse > 2000ms",
							high_errors: "Simule un taux d'erreur > 10%",
							disk_full: "Simule un espace disque > 90%",
							db_overload: "Simule une surcharge DB > 30 connexions",
						},
					},
					400
				)
			}

			console.log(`🧪 Déclenchement manuel de simulation: ${condition}`)
			const alerts = await this.monitoringService.simulateCondition(condition)

			return c.json({
				success: true,
				message: `Condition '${condition}' simulée avec succès`,
				alertsGenerated: alerts.length,
				alerts: alerts,
				note: "L'anomalie devrait apparaître dans le dashboard dans les 30 secondes.",
			})
		} catch (error) {
			console.error("❌ Erreur lors de la simulation:", error)
			return c.json(
				{
					error: "Erreur lors de la simulation",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500
			)
		}
	}

	static getStatusValue(status: string): number {
		switch (status) {
			case "healthy":
				return 1
			case "degraded":
				return 0.5
			case "unhealthy":
				return 0
			default:
				return 0
		}
	}
}
