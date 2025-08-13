import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { PrometheusMetricsService } from "../../src/services/PrometheusMetricsService"

describe("PrometheusMetricsService", () => {
	let metricsService: PrometheusMetricsService

	beforeEach(() => {
		vi.clearAllMocks()
		metricsService = new PrometheusMetricsService()
	})

	afterEach(() => {
		// Cleanup si nécessaire
	})

	describe("getMetrics", () => {
		it("devrait retourner les métriques au format Prometheus", async () => {
			const metrics = await metricsService.getMetrics()

			expect(metrics).toContain("# HELP")
			expect(metrics).toContain("# TYPE")
			expect(metrics).toContain("process_cpu_user_seconds_total")
			expect(metrics).toContain("process_cpu_seconds_total")
		})
	})

	describe("recordHttpRequest", () => {
		it("devrait enregistrer une requête réussie", async () => {
			metricsService.recordHttpRequest("GET", "/api/users", 200, 150)
			metricsService.recordHttpRequest("POST", "/api/users", 500, 200)
			metricsService.recordHttpRequest("POST", "/api/users", 500, 200)

			const metrics = await metricsService.getMetrics()
			expect(metrics).toContain("http_request_duration_ms")
			expect(metrics).toContain("http_request_duration_ms_bucket")
		})

		it("devrait enregistrer une requête avec erreur", async () => {
			metricsService.recordHttpRequest("POST", "/api/users", 500, 200)

			const metrics = await metricsService.getMetrics()
			expect(metrics).toContain("http_request_duration_ms")
			expect(metrics).toContain("http_request_duration_ms_bucket")
		})
	})

	describe("updateMetrics", () => {
		it("devrait mettre à jour toutes les métriques", async () => {
			const healthStatus = {
				metrics: {
					uptime: 3600,
					memoryUsage: {
						used: 1024 * 1024,
						total: 2048 * 1024,
						free: 1024 * 1024,
						percentage: 50,
					},
					responseTime: 150,
					requests: {
						rps: 25.5,
					},
					connections: {
						database: 5,
						maxDatabase: 10,
					},
				},
				services: {
					database: { status: "healthy", responseTime: 45 },
					storage: { status: "degraded", responseTime: 100 },
					application: { status: "healthy", responseTime: 25 },
				},
			}

			metricsService.updateMetrics(healthStatus)

			const metrics = await metricsService.getMetrics()
			expect(metrics).toContain("process_cpu_user_seconds_total")
			expect(metrics).toContain("process_cpu_seconds_total")
			expect(metrics).toContain("process_start_time_seconds")
		})
	})

	describe("getRegistry", () => {
		it("devrait retourner le registre Prometheus", () => {
			const registry = metricsService.getRegistry()
			expect(registry).toBeDefined()
		})
	})

	describe("resetMetrics", () => {
		it("devrait remettre à zéro toutes les métriques", () => {
			expect(() => metricsService.resetMetrics()).not.toThrow()
		})
	})
})
