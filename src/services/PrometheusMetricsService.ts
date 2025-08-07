import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from "prom-client"

class PrometheusMetricsService {
	private registry: Registry

	// Métriques de base de l'application
	private uptimeGauge!: Gauge<string>
	private memoryUsageGauge!: Gauge<string>
	private memoryPercentGauge!: Gauge<string>
	private responseTimeGauge!: Gauge<string>
	private requestsTotal!: Counter<string>
	private requestsErrors!: Counter<string>
	private requestsPerSecond!: Gauge<string>
	private databaseConnections!: Gauge<string>
	private serviceStatus!: Gauge<string>
	private serviceResponseTime!: Gauge<string>

	// Métriques de performance avec histogramme
	private httpRequestDuration!: Histogram<string>

	constructor() {
		this.registry = new Registry()

		// Collecte les métriques système par défaut (CPU, mémoire, etc.)
		collectDefaultMetrics({ register: this.registry })

		this.initializeMetrics()
	}

	private initializeMetrics() {
		// Uptime de l'application
		this.uptimeGauge = new Gauge({
			name: "app_uptime_seconds",
			help: "Application uptime in seconds",
			registers: [this.registry],
		})

		// Utilisation mémoire
		this.memoryUsageGauge = new Gauge({
			name: "app_memory_usage_bytes",
			help: "Memory usage in bytes",
			labelNames: ["type"],
			registers: [this.registry],
		})

		this.memoryPercentGauge = new Gauge({
			name: "app_memory_usage_percent",
			help: "Memory usage percentage",
			registers: [this.registry],
		})

		// Temps de réponse moyen
		this.responseTimeGauge = new Gauge({
			name: "app_response_time_ms",
			help: "Average response time in milliseconds",
			registers: [this.registry],
		})

		// Requêtes totales
		this.requestsTotal = new Counter({
			name: "app_requests_total",
			help: "Total number of requests",
			registers: [this.registry],
		})

		// Erreurs de requêtes
		this.requestsErrors = new Counter({
			name: "app_requests_errors_total",
			help: "Total number of error requests",
			registers: [this.registry],
		})

		// Requêtes par seconde
		this.requestsPerSecond = new Gauge({
			name: "app_requests_per_second",
			help: "Requests per second",
			registers: [this.registry],
		})

		// Connexions base de données
		this.databaseConnections = new Gauge({
			name: "app_database_connections",
			help: "Active database connections",
			labelNames: ["type"],
			registers: [this.registry],
		})

		// Statut des services
		this.serviceStatus = new Gauge({
			name: "app_service_status",
			help: "Service health status (1=healthy, 0.5=degraded, 0=unhealthy)",
			labelNames: ["service"],
			registers: [this.registry],
		})

		// Temps de réponse des services
		this.serviceResponseTime = new Gauge({
			name: "app_service_response_time_ms",
			help: "Service response time in milliseconds",
			labelNames: ["service"],
			registers: [this.registry],
		})

		// Histogramme pour la distribution des temps de réponse
		this.httpRequestDuration = new Histogram({
			name: "http_request_duration_ms",
			help: "Duration of HTTP requests in milliseconds",
			labelNames: ["method", "route", "status_code"],
			buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
			registers: [this.registry],
		})
	}

	/**
	 * Met à jour toutes les métriques avec les données actuelles
	 */
	updateMetrics(healthStatus: any) {
		const metrics = healthStatus.metrics

		// Uptime
		this.uptimeGauge.set(metrics.uptime)

		// Mémoire
		this.memoryUsageGauge.set({ type: "used" }, metrics.memoryUsage.used)
		this.memoryUsageGauge.set({ type: "total" }, metrics.memoryUsage.total)
		this.memoryUsageGauge.set({ type: "free" }, metrics.memoryUsage.free)
		this.memoryPercentGauge.set(metrics.memoryUsage.percentage)

		// Performance
		this.responseTimeGauge.set(metrics.responseTime)
		this.requestsTotal.inc(0) // Reset à la valeur courante
		this.requestsErrors.inc(0) // Reset à la valeur courante
		this.requestsPerSecond.set(metrics.requests.rps)

		// Base de données
		this.databaseConnections.set({ type: "active" }, metrics.connections.database)
		this.databaseConnections.set({ type: "max" }, metrics.connections.maxDatabase)

		// Services
		const services = healthStatus.services
		this.serviceStatus.set({ service: "database" }, this.getStatusValue(services.database.status))
		this.serviceStatus.set({ service: "storage" }, this.getStatusValue(services.storage.status))
		this.serviceStatus.set({ service: "application" }, this.getStatusValue(services.application.status))

		this.serviceResponseTime.set({ service: "database" }, services.database.responseTime || 0)
		this.serviceResponseTime.set({ service: "storage" }, services.storage.responseTime || 0)
	}

	/**
	 * Enregistre une requête HTTP pour les métriques de performance
	 */
	recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
		this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration)

		this.requestsTotal.inc()
		if (statusCode >= 400) {
			this.requestsErrors.inc()
		}
	}

	/**
	 * Convertit le statut en valeur numérique
	 */
	private getStatusValue(status: string): number {
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

	/**
	 * Génère les métriques au format Prometheus
	 */
	async getMetrics(): Promise<string> {
		return await this.registry.metrics()
	}

	/**
	 * Remet à zéro toutes les métriques
	 */
	resetMetrics() {
		this.registry.resetMetrics()
	}

	/**
	 * Obtient le registre pour usage externe
	 */
	getRegistry(): Registry {
		return this.registry
	}
}

export default new PrometheusMetricsService()
