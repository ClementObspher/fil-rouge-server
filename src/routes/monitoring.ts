import { Hono } from "hono"
import { readFileSync } from "fs"
import { join } from "path"
import MonitoringService from "../services/MonitoringService"
import LoggerService from "../services/LoggerService"

const monitoring = new Hono()

/**
 * Dashboard de monitoring
 * GET /dashboard
 */
monitoring.get("/dashboard", (c) => {
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
})

/**
 * Health Check Principal - Endpoint simple pour vérifications automatisées
 * GET /health
 */
monitoring.get("/health", async (c) => {
	try {
		const healthStatus = await MonitoringService.getHealthStatus()

		// Status HTTP basé sur la santé globale
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
})

/**
 * Health Check Détaillé - Informations complètes pour debugging
 * GET /health/detailed
 */
monitoring.get("/health/detailed", async (c) => {
	try {
		const healthStatus = await MonitoringService.getHealthStatus()

		// Ajoute des métriques système détaillées
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
})

/**
 * Métriques au format Prometheus
 * GET /metrics
 */
monitoring.get("/metrics", async (c) => {
	try {
		const healthStatus = await MonitoringService.getHealthStatus()
		const metrics = healthStatus.metrics

		// Format Prometheus
		const prometheusMetrics = `
# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds ${metrics.uptime}

# HELP app_memory_usage_bytes Memory usage in bytes
# TYPE app_memory_usage_bytes gauge
app_memory_usage_bytes{type="used"} ${metrics.memoryUsage.used}
app_memory_usage_bytes{type="total"} ${metrics.memoryUsage.total}
app_memory_usage_bytes{type="free"} ${metrics.memoryUsage.free}

# HELP app_memory_usage_percent Memory usage percentage
# TYPE app_memory_usage_percent gauge
app_memory_usage_percent ${metrics.memoryUsage.percentage}

# HELP app_response_time_ms Average response time in milliseconds
# TYPE app_response_time_ms gauge
app_response_time_ms ${metrics.responseTime}

# HELP app_requests_total Total number of requests
# TYPE app_requests_total counter
app_requests_total ${metrics.requests.total}

# HELP app_requests_errors_total Total number of error requests
# TYPE app_requests_errors_total counter
app_requests_errors_total ${metrics.requests.errors}

# HELP app_requests_per_second Requests per second
# TYPE app_requests_per_second gauge
app_requests_per_second ${metrics.requests.rps}

# HELP app_database_connections Active database connections
# TYPE app_database_connections gauge
app_database_connections{type="active"} ${metrics.connections.database}
app_database_connections{type="max"} ${metrics.connections.maxDatabase}

# HELP app_service_status Service health status (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE app_service_status gauge
app_service_status{service="database"} ${getStatusValue(healthStatus.services.database.status)}
app_service_status{service="storage"} ${getStatusValue(healthStatus.services.storage.status)}
app_service_status{service="application"} ${getStatusValue(healthStatus.services.application.status)}

# HELP app_service_response_time_ms Service response time in milliseconds
# TYPE app_service_response_time_ms gauge
app_service_response_time_ms{service="database"} ${healthStatus.services.database.responseTime || 0}
app_service_response_time_ms{service="storage"} ${healthStatus.services.storage.responseTime || 0}
    `.trim()

		return c.text(prometheusMetrics, 200, {
			"Content-Type": "text/plain; version=0.0.4; charset=utf-8",
		})
	} catch (error) {
		console.error("Erreur lors de la génération des métriques:", error)
		return c.text("# Error generating metrics", 500)
	}
})

/**
 * Alertes actives
 * GET /alerts
 */
monitoring.get("/alerts", async (c) => {
	try {
		const alerts = await MonitoringService.checkThresholds()

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
})

/**
 * Readiness Check - Vérifie si l'application est prête à recevoir du trafic
 * GET /ready
 */
monitoring.get("/ready", async (c) => {
	try {
		const healthStatus = await MonitoringService.getHealthStatus()

		// L'application est prête si tous les services critiques sont disponibles
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
})

/**
 * Liveness Check - Vérifie si l'application est vivante
 * GET /live
 */
monitoring.get("/live", async (c) => {
	try {
		// Check simple pour vérifier que l'application répond
		const startTime = Date.now()

		// Test de base - l'application répond
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
})

/**
 * Version et informations de l'application
 * GET /info
 */
monitoring.get("/info", async (c) => {
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
})

/**
 * Logs récents par niveau
 * GET /logs/:level?lines=100
 */
monitoring.get("/logs/:level", async (c) => {
	try {
		const level = c.req.param("level") as "info" | "warn" | "error" | "debug"
		const lines = parseInt(c.req.query("lines") || "100")

		if (!["info", "warn", "error", "debug"].includes(level)) {
			return c.json({ error: "Niveau de log invalide. Utilisez: info, warn, error, debug" }, 400)
		}

		const logs = LoggerService.getRecentLogs(level, lines)
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
})

/**
 * Recherche de logs par Request ID
 * GET /logs/request/:requestId
 */
monitoring.get("/logs/request/:requestId", async (c) => {
	try {
		const requestId = c.req.param("requestId")
		const logs = LoggerService.findLogsByRequestId(requestId)

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
})

/**
 * Résumé des logs des dernières heures
 * GET /logs/summary?hours=24
 */
monitoring.get("/logs/summary", async (c) => {
	try {
		const hours = parseInt(c.req.query("hours") || "24")
		const summary = LoggerService.getLogsSummary(hours)

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
})

/**
 * Tous les logs (debug endpoint)
 * GET /logs/all?lines=50
 */
monitoring.get("/logs/all", async (c) => {
	try {
		const lines = parseInt(c.req.query("lines") || "50")

		const allLogs = [
			...LoggerService.getRecentLogs("error", lines),
			...LoggerService.getRecentLogs("warn", lines),
			...LoggerService.getRecentLogs("info", lines),
			...LoggerService.getRecentLogs("debug", lines),
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
})

// Helper function pour convertir le status en valeur numérique
function getStatusValue(status: string): number {
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

export default monitoring
