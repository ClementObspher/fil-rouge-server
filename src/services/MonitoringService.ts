import { PrismaClient } from "@prisma/client"
import minioClient from "../lib/minioClient"
import prisma from "../lib/prisma"

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
	cpuUsage: CpuUsage
	connections: {
		database: number
		maxDatabase: number
	}
	requests: RequestMetrics
	diskSpace: {
		used: number
		total: number
		percentage: number
	}
}

export interface MemoryUsage {
	used: number
	total: number
	percentage: number
	free: number
}

export interface CpuUsage {
	used: number
	total: number
	percentage: number
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

export class MonitoringService {
	private prisma: PrismaClient
	private startTime: number
	private requestMetrics: Map<string, number[]> = new Map()
	private errorCount = 0
	private totalRequests = 0
	private responseTimes: number[] = []

	constructor() {
		this.prisma = prisma
		this.startTime = Date.now()

		setInterval(() => this.cleanupMetrics(), 3600000)
	}

	async getHealthStatus(): Promise<HealthStatus> {
		const timestamp = new Date().toISOString()

		const [dbHealth, storageHealth, appHealth] = await Promise.all([this.checkDatabaseHealth(), this.checkStorageHealth(), this.checkApplicationHealth()])

		const systemMetrics = await this.getSystemMetrics()

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

	async checkDatabaseHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()

		try {
			await this.prisma.$queryRaw`SELECT 1`

			const responseTime = Date.now() - startTime

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

	async checkStorageHealth(): Promise<ServiceHealth> {
		const startTime = Date.now()

		try {
			const buckets = await minioClient.listBuckets()
			const responseTime = Date.now() - startTime

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

	async checkApplicationHealth(): Promise<ServiceHealth> {
		const uptime = Date.now() - this.startTime
		const memoryUsage = this.getMemoryUsage()

		const memoryStatus = this.evaluateHealthStatus({
			responseTime: memoryUsage.percentage,
			thresholds: { warning: 75, critical: 85 },
		})

		return {
			status: memoryStatus,
			lastCheck: new Date().toISOString(),
			uptime: Math.floor(uptime / 1000),
			details: {
				memoryUsage: `${memoryUsage.percentage.toFixed(1)}%`,
				memoryUsed: `${Math.round(memoryUsage.used / 1024 / 1024)}MB`,
				nodeVersion: process.version,
				platform: process.platform,
				pid: process.pid,
			},
		}
	}

	async getSystemMetrics(): Promise<SystemMetrics> {
		const uptime = Math.floor((Date.now() - this.startTime) / 1000)
		const memoryUsage = this.getMemoryUsage()
		const cpuUsage = await this.getCpuUsage()
		const dbConnections = await this.getDatabaseConnections()
		const requestMetrics = this.getRequestMetrics()
		const diskSpace = await this.getDiskSpace()

		return {
			uptime,
			responseTime: requestMetrics.averageResponseTime,
			memoryUsage,
			cpuUsage,
			connections: {
				database: dbConnections.active,
				maxDatabase: dbConnections.max,
			},
			requests: requestMetrics,
			diskSpace,
		}
	}

	private async getCpuUsage(): Promise<CpuUsage> {
		const startUsage = process.cpuUsage()
		const startTime = process.hrtime()

		await new Promise((resolve) => setTimeout(resolve, 100))

		const elapsedHr = process.hrtime(startTime)
		const elapsedMicros = elapsedHr[0] * 1e6 + elapsedHr[1] / 1000

		const cpuDiff = process.cpuUsage(startUsage)
		const used = cpuDiff.user + cpuDiff.system

		const percentage = Math.min((used / elapsedMicros) * 100, 100)

		return {
			used,
			total: elapsedMicros,
			percentage,
		}
	}

	private async getDiskSpace(): Promise<{ used: number; total: number; percentage: number }> {
		try {
			const result = await this.prisma.$queryRaw<Array<{ size: bigint }>>`
				SELECT pg_database_size(current_database()) as size
			`

			const databaseSize = Number(result[0]?.size || 0)

			const tablespaceResult = await this.prisma.$queryRaw<Array<{ total_size: bigint }>>`
				SELECT COALESCE(
					(SELECT sum(pg_tablespace_size(oid)) FROM pg_tablespace),
					pg_database_size(current_database()) * 10
				) as total_size
			`

			const totalSpace = Number(tablespaceResult[0]?.total_size || databaseSize * 10)
			const percentage = totalSpace > 0 ? Math.min(Math.round((databaseSize / totalSpace) * 100), 100) : 0

			return {
				used: databaseSize,
				total: totalSpace,
				percentage,
			}
		} catch (error) {
			console.error("Erreur lors du calcul de l'espace disque:", error)
			return { used: 0, total: 0, percentage: 0 }
		}
	}

	recordRequest(path: string, responseTime: number, isError: boolean = false): void {
		this.totalRequests++
		this.responseTimes.push(responseTime)

		if (isError) {
			this.errorCount++
		}

		if (this.responseTimes.length > 1000) {
			this.responseTimes = this.responseTimes.slice(-1000)
		}

		if (!this.requestMetrics.has(path)) {
			this.requestMetrics.set(path, [])
		}
		this.requestMetrics.get(path)?.push(responseTime)
	}

	async checkThresholds(): Promise<AlertConfig[]> {
		const alerts: AlertConfig[] = []
		const healthStatus = await this.getHealthStatus()

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

		const metrics = healthStatus.metrics

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

		if (metrics.connections.database > 50) {
			alerts.push({
				type: "critical",
				message: "Nombre de connexions DB critique",
				service: "database",
				metric: "connections",
				threshold: 50,
				currentValue: metrics.connections.database,
				timestamp: new Date().toISOString(),
			})
		} else if (metrics.connections.database > 30) {
			alerts.push({
				type: "warning",
				message: "Nombre de connexions DB élevé",
				service: "database",
				metric: "connections",
				threshold: 30,
				currentValue: metrics.connections.database,
				timestamp: new Date().toISOString(),
			})
		}

		if (metrics.requests.rps > 100) {
			alerts.push({
				type: "warning",
				message: "Charge de requêtes très élevée",
				service: "application",
				metric: "rps",
				threshold: 100,
				currentValue: metrics.requests.rps,
				timestamp: new Date().toISOString(),
			})
		}

		if (metrics.requests.total >= 20 && metrics.requests.errors >= 5) {
			const recentErrorRate = (metrics.requests.errors / metrics.requests.total) * 100
			if (recentErrorRate > 15) {
				alerts.push({
					type: "critical",
					message: "Pattern d'erreurs répétées détecté",
					service: "application",
					metric: "errorPattern",
					threshold: 15,
					currentValue: recentErrorRate,
					timestamp: new Date().toISOString(),
				})
			}
		}

		if (metrics.diskSpace.percentage > 90) {
			alerts.push({
				type: "critical",
				message: "Espace disque critique",
				service: "storage",
				metric: "diskSpace",
				threshold: 90,
				currentValue: metrics.diskSpace.percentage,
				timestamp: new Date().toISOString(),
			})
		} else if (metrics.diskSpace.percentage > 80) {
			alerts.push({
				type: "warning",
				message: "Espace disque faible",
				service: "storage",
				metric: "diskSpace",
				threshold: 80,
				currentValue: metrics.diskSpace.percentage,
				timestamp: new Date().toISOString(),
			})
		}

		if (this.responseTimes.length >= 5) {
			const recent = this.responseTimes.slice(-5)
			const average = recent.reduce((a, b) => a + b, 0) / recent.length
			const trend = recent[recent.length - 1] - recent[0]

			if (trend > 500 && average > 800) {
				alerts.push({
					type: "warning",
					message: "Dégradation progressive des performances détectée",
					service: "application",
					metric: "performanceTrend",
					threshold: 500,
					currentValue: trend,
					timestamp: new Date().toISOString(),
				})
			}
		}

		if (metrics.cpuUsage.percentage > 85) {
			alerts.push({
				type: "warning",
				message: "Utilisation CPU élevée",
				service: "application",
				metric: "cpuUsage",
				threshold: 85,
				currentValue: metrics.cpuUsage.percentage,
				timestamp: new Date().toISOString(),
			})
		} else if (metrics.cpuUsage.percentage > 95) {
			alerts.push({
				type: "critical",
				message: "Utilisation CPU critique",
				service: "application",
				metric: "cpuUsage",
				threshold: 95,
				currentValue: metrics.cpuUsage.percentage,
				timestamp: new Date().toISOString(),
			})
		}

		return alerts
	}

	async simulateCondition(condition: "high_memory" | "slow_response" | "high_errors" | "disk_full" | "db_overload"): Promise<AlertConfig[]> {
		console.log(`🧪 Simulation de condition: ${condition}`)

		const alerts: AlertConfig[] = []
		const timestamp = new Date().toISOString()

		switch (condition) {
			case "high_memory":
				alerts.push({
					type: "critical",
					message: "SIMULATION: Utilisation mémoire critique",
					service: "application",
					metric: "memory",
					threshold: 85,
					currentValue: 95,
					timestamp,
				})
				break

			case "slow_response":
				alerts.push({
					type: "warning",
					message: "SIMULATION: Temps de réponse très élevé",
					service: "application",
					metric: "responseTime",
					threshold: 1000,
					currentValue: 2500,
					timestamp,
				})
				break

			case "high_errors":
				alerts.push({
					type: "critical",
					message: "SIMULATION: Taux d'erreur critique",
					service: "application",
					metric: "errorRate",
					threshold: 10,
					currentValue: 25,
					timestamp,
				})
				break

			case "disk_full":
				alerts.push({
					type: "critical",
					message: "SIMULATION: Espace disque critique",
					service: "storage",
					metric: "diskSpace",
					threshold: 90,
					currentValue: 98,
					timestamp,
				})
				break

			case "db_overload":
				alerts.push({
					type: "warning",
					message: "SIMULATION: Surcharge de la base de données",
					service: "database",
					metric: "connections",
					threshold: 30,
					currentValue: 45,
					timestamp,
				})
				break
		}

		// Traiter ces alertes de simulation
		if (alerts.length > 0) {
			const { default: AlertService } = await import("./AlertService")
			for (const alert of alerts) {
				await AlertService.processAlert(alert)
			}
		}

		return alerts
	}

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
		const used = usage.rss
		const systemMemory = 8 * 1024 * 1024 * 1024
		const total = process.env.SYSTEM_MEMORY_BYTES ? parseInt(process.env.SYSTEM_MEMORY_BYTES) : systemMemory
		const free = total - used
		const percentage = Math.min((used / total) * 100, 100)

		return {
			used,
			total,
			free,
			percentage,
		}
	}

	private async getDatabaseConnections(): Promise<{ active: number; max: number }> {
		try {
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
		const now = Date.now()
		const oneMinuteAgo = now - 60000

		const uptime = (now - this.startTime) / 1000
		return uptime > 0 ? Math.round(this.totalRequests / uptime) : 0
	}

	private cleanupMetrics(): void {
		this.responseTimes = this.responseTimes.slice(-1000)

		this.requestMetrics.forEach((times, path) => {
			this.requestMetrics.set(path, times.slice(-100))
		})
	}
}

export default new MonitoringService()
