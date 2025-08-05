import { PrismaClient } from "@prisma/client"
import minioClient from "../lib/minioClient"

export interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy"
	timestamp: string
	version: string
	services: {
		database: ServiceHealth
		storage: ServiceHealth
		application: ServiceHealth
	}
	metrics: SystemMetrics
}

export interface ServiceHealth {
	status: "healthy" | "degraded" | "unhealthy"
	responseTime?: number
	details?: Record<string, any>
	lastCheck: string
	uptime?: number
}

export interface SystemMetrics {
	uptime: number
	responseTime: number
	memoryUsage: MemoryUsage
	cpuUsage?: number
	connections: {
		database: number
		maxDatabase: number
	}
	requests: RequestMetrics
}

export interface MemoryUsage {
	used: number
	total: number
	percentage: number
	free: number
}

export interface RequestMetrics {
	total: number
	errors: number
	averageResponseTime: number
	rps: number // requests per second
}

export interface AlertConfig {
	type: "critical" | "warning" | "info"
	message: string
	service: string
	metric: string
	threshold: number
	currentValue: number
	timestamp: string
}

class MonitoringService {
	private prisma: PrismaClient
	private startTime: number
	private requestMetrics: Map<string, number[]> = new Map()
	private errorCount = 0
	private totalRequests = 0
	private responseTimes: number[] = []

	constructor() {
		this.prisma = new PrismaClient()
		this.startTime = Date.now()

		// Nettoyer les métriques toutes les heures
		setInterval(() => this.cleanupMetrics(), 3600000) // 1 heure
	}

	/**
	 * Vérifie la santé globale du système
	 */
	async getHealthStatus(): Promise<HealthStatus> {
		const timestamp = new Date().toISOString()

		const [dbHealth, storageHealth, appHealth] = await Promise.all([this.checkDatabaseHealth(), this.checkStorageHealth(), this.checkApplicationHealth()])

		const systemMetrics = await this.getSystemMetrics()

		// Détermine le statut global
		const overallStatus = this.determineOverallStatus([dbHealth, storageHealth, appHealth])

		return {
			status: overallStatus,
			timestamp,
			version: process.env.APP_VERSION || "1.0.0",
			services: {
				database: dbHealth,
				storage: storageHealth,
				application: appHealth,
			},
			metrics: systemMetrics,
		}
	}

	/**
	 * Vérifie la santé de la base de données
	 */
	async checkDatabaseHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()

		try {
			// Test de connectivité simple
			await this.prisma.$queryRaw`SELECT 1`

			const responseTime = Date.now() - startTime

			// Vérifie les connexions actives
			const connections = await this.getDatabaseConnections()

			const status = this.evaluateHealthStatus({
				responseTime,
				thresholds: { warning: 1000, critical: 5000 },
			})

			return {
				status,
				responseTime,
				lastCheck: new Date().toISOString(),
				details: {
					connections: connections.active,
					maxConnections: connections.max,
					connectionUsage: `${Math.round((connections.active / connections.max) * 100)}%`,
				},
			}
		} catch (error) {
			return {
				status: "unhealthy",
				lastCheck: new Date().toISOString(),
				details: {
					error: error instanceof Error ? error.message : "Database connection failed",
				},
			}
		}
	}

	/**
	 * Vérifie la santé du stockage MinIO
	 */
	async checkStorageHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()

		try {
			// Test de connectivité à MinIO
			const buckets = await minioClient.listBuckets()
			const responseTime = Date.now() - startTime

			// Vérifie l'espace disque disponible
			const bucketExists = await minioClient.bucketExists("images")

			const status = this.evaluateHealthStatus({
				responseTime,
				thresholds: { warning: 2000, critical: 10000 },
			})

			return {
				status: bucketExists ? status : "degraded",
				responseTime,
				lastCheck: new Date().toISOString(),
				details: {
					bucketsCount: buckets.length,
					imagesBucketExists: bucketExists,
					endpoint: process.env.MINIO_ENDPOINT || "localhost:9000",
				},
			}
		} catch (error) {
			return {
				status: "unhealthy",
				lastCheck: new Date().toISOString(),
				details: {
					error: error instanceof Error ? error.message : "Storage connection failed",
				},
			}
		}
	}

	/**
	 * Vérifie la santé de l'application
	 */
	async checkApplicationHealth(): Promise<ServiceHealth> {
		const uptime = Date.now() - this.startTime
		const memoryUsage = this.getMemoryUsage()

		// Évalue la santé basée sur l'utilisation mémoire
		const memoryStatus = this.evaluateHealthStatus({
			responseTime: memoryUsage.percentage,
			thresholds: { warning: 75, critical: 85 },
		})

		return {
			status: memoryStatus,
			lastCheck: new Date().toISOString(),
			uptime: Math.floor(uptime / 1000), // en secondes
			details: {
				memoryUsage: `${memoryUsage.percentage.toFixed(1)}%`,
				memoryUsed: `${Math.round(memoryUsage.used / 1024 / 1024)}MB`,
				nodeVersion: process.version,
				platform: process.platform,
				pid: process.pid,
			},
		}
	}

	/**
	 * Collecte les métriques système
	 */
	async getSystemMetrics(): Promise<SystemMetrics> {
		const uptime = Math.floor((Date.now() - this.startTime) / 1000)
		const memoryUsage = this.getMemoryUsage()
		const dbConnections = await this.getDatabaseConnections()
		const requestMetrics = this.getRequestMetrics()

		return {
			uptime,
			responseTime: requestMetrics.averageResponseTime,
			memoryUsage,
			connections: {
				database: dbConnections.active,
				maxDatabase: dbConnections.max,
			},
			requests: requestMetrics,
		}
	}

	/**
	 * Enregistre une requête pour les métriques
	 */
	recordRequest(path: string, responseTime: number, isError: boolean = false): void {
		this.totalRequests++
		this.responseTimes.push(responseTime)

		if (isError) {
			this.errorCount++
		}

		// Garde seulement les 1000 derniers temps de réponse
		if (this.responseTimes.length > 1000) {
			this.responseTimes = this.responseTimes.slice(-1000)
		}

		// Enregistre par endpoint
		if (!this.requestMetrics.has(path)) {
			this.requestMetrics.set(path, [])
		}
		this.requestMetrics.get(path)?.push(responseTime)
	}

	/**
	 * Vérifie les seuils et génère des alertes
	 */
	async checkThresholds(): Promise<AlertConfig[]> {
		const alerts: AlertConfig[] = []
		const healthStatus = await this.getHealthStatus()

		// Vérifications de disponibilité
		Object.entries(healthStatus.services).forEach(([serviceName, service]) => {
			if (service.status === "unhealthy") {
				alerts.push({
					type: "critical",
					message: `Service ${serviceName} est indisponible`,
					service: serviceName,
					metric: "availability",
					threshold: 100,
					currentValue: 0,
					timestamp: new Date().toISOString(),
				})
			} else if (service.status === "degraded") {
				alerts.push({
					type: "warning",
					message: `Service ${serviceName} a des performances dégradées`,
					service: serviceName,
					metric: "performance",
					threshold: service.responseTime || 0,
					currentValue: service.responseTime || 0,
					timestamp: new Date().toISOString(),
				})
			}
		})

		// Vérifications de performance
		const metrics = healthStatus.metrics

		// Mémoire (seuils ajustés)
		if (metrics.memoryUsage.percentage > 85) {
			alerts.push({
				type: "critical",
				message: "Utilisation mémoire critique",
				service: "application",
				metric: "memory",
				threshold: 85,
				currentValue: metrics.memoryUsage.percentage,
				timestamp: new Date().toISOString(),
			})
		} else if (metrics.memoryUsage.percentage > 75) {
			alerts.push({
				type: "warning",
				message: "Utilisation mémoire élevée",
				service: "application",
				metric: "memory",
				threshold: 75,
				currentValue: metrics.memoryUsage.percentage,
				timestamp: new Date().toISOString(),
			})
		}

		// Temps de réponse
		if (metrics.responseTime > 2000) {
			alerts.push({
				type: "critical",
				message: "Temps de réponse très élevé",
				service: "application",
				metric: "responseTime",
				threshold: 2000,
				currentValue: metrics.responseTime,
				timestamp: new Date().toISOString(),
			})
		} else if (metrics.responseTime > 1000) {
			alerts.push({
				type: "warning",
				message: "Temps de réponse élevé",
				service: "application",
				metric: "responseTime",
				threshold: 1000,
				currentValue: metrics.responseTime,
				timestamp: new Date().toISOString(),
			})
		}

		// Taux d'erreur (seulement si assez de requêtes pour être significatif)
		if (metrics.requests.total >= 10) {
			const errorRate = (metrics.requests.errors / metrics.requests.total) * 100
			if (errorRate > 10) {
				alerts.push({
					type: "critical",
					message: "Taux d'erreur très élevé",
					service: "application",
					metric: "errorRate",
					threshold: 10,
					currentValue: errorRate,
					timestamp: new Date().toISOString(),
				})
			} else if (errorRate > 5) {
				alerts.push({
					type: "warning",
					message: "Taux d'erreur élevé",
					service: "application",
					metric: "errorRate",
					threshold: 5,
					currentValue: errorRate,
					timestamp: new Date().toISOString(),
				})
			}
		}

		return alerts
	}

	// Méthodes privées utilitaires

	private evaluateHealthStatus(params: { responseTime: number; thresholds: { warning: number; critical: number } }): "healthy" | "degraded" | "unhealthy" {
		if (params.responseTime > params.thresholds.critical) {
			return "unhealthy"
		} else if (params.responseTime > params.thresholds.warning) {
			return "degraded"
		}
		return "healthy"
	}

	private determineOverallStatus(services: ServiceHealth[]): "healthy" | "degraded" | "unhealthy" {
		if (services.some((s) => s.status === "unhealthy")) {
			return "unhealthy"
		} else if (services.some((s) => s.status === "degraded")) {
			return "degraded"
		}
		return "healthy"
	}

	private getMemoryUsage(): MemoryUsage {
		const usage = process.memoryUsage()
		// Utilise RSS (Resident Set Size) qui est plus représentatif
		const used = usage.rss
		// Estime la mémoire système disponible (en production, on devrait avoir cette info)
		const systemMemory = 8 * 1024 * 1024 * 1024 // 8GB par défaut, configurable
		const total = process.env.SYSTEM_MEMORY_BYTES ? parseInt(process.env.SYSTEM_MEMORY_BYTES) : systemMemory
		const free = total - used
		const percentage = Math.min((used / total) * 100, 100) // Cap à 100%

		return {
			used,
			total,
			free,
			percentage,
		}
	}

	private async getDatabaseConnections(): Promise<{ active: number; max: number }> {
		try {
			// Requête pour obtenir les connexions actives PostgreSQL
			const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `

			const maxResult = await this.prisma.$queryRaw<Array<{ setting: string }>>`
        SHOW max_connections
      `

			const active = Number(result[0]?.count || 0)
			const max = parseInt(maxResult[0]?.setting || "100")

			return { active, max }
		} catch (error) {
			console.error("Erreur lors de la récupération des connexions DB:", error)
			return { active: 0, max: 100 }
		}
	}

	private getRequestMetrics(): RequestMetrics {
		const averageResponseTime = this.responseTimes.length > 0 ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0

		return {
			total: this.totalRequests,
			errors: this.errorCount,
			averageResponseTime: Math.round(averageResponseTime),
			rps: this.calculateRPS(),
		}
	}

	private calculateRPS(): number {
		// Calcul basé sur les requêtes des 60 dernières secondes
		const now = Date.now()
		const oneMinuteAgo = now - 60000

		// Simple approximation - dans un vrai système, on garderait un historique temporel
		const uptime = (now - this.startTime) / 1000
		return uptime > 0 ? Math.round(this.totalRequests / uptime) : 0
	}

	private cleanupMetrics(): void {
		// Nettoie les métriques anciennes pour éviter la consommation mémoire
		this.responseTimes = this.responseTimes.slice(-1000)

		// Nettoie les métriques par endpoint
		this.requestMetrics.forEach((times, path) => {
			this.requestMetrics.set(path, times.slice(-100))
		})
	}
}

export default new MonitoringService()
