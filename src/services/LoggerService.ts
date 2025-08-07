import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join } from "path"

export interface LogEntry {
	timestamp: string
	level: "info" | "warn" | "error" | "debug"
	message: string
	requestId?: string
	data?: Record<string, any>
	service: string
}

class LoggerService {
	private logsDir: string

	constructor() {
		this.logsDir = join(process.cwd(), "logs")
		this.ensureLogsDirectory()
	}

	private ensureLogsDirectory(): void {
		if (!existsSync(this.logsDir)) {
			mkdirSync(this.logsDir, { recursive: true })
		}
	}

	private getLogFilePath(level: string): string {
		const date = new Date().toISOString().split("T")[0] // YYYY-MM-DD
		return join(this.logsDir, `${level}-${date}.log`)
	}

	private formatLogEntry(entry: LogEntry): string {
		return (
			JSON.stringify({
				timestamp: entry.timestamp,
				level: entry.level,
				service: entry.service,
				requestId: entry.requestId,
				message: entry.message,
				...entry.data,
			}) + "\n"
		)
	}

	private writeToFile(level: string, formattedLog: string): void {
		try {
			const filePath = this.getLogFilePath(level)
			appendFileSync(filePath, formattedLog, "utf8")

			// TODO: Implémenter la rotation des fichiers si nécessaire
			// this.rotateIfNeeded(filePath)
		} catch (error) {
			console.error("Erreur écriture log fichier:", error)
		}
	}

	/**
	 * Log d'information général
	 */
	info(message: string, data?: Record<string, any>, requestId?: string): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: "info",
			message,
			requestId,
			data,
			service: "fil-rouge-server",
		}

		// Console + Fichier
		console.log("INFO:", this.formatLogEntry(entry).trim())
		this.writeToFile("info", this.formatLogEntry(entry))
	}

	/**
	 * Log d'avertissement
	 */
	warn(message: string, data?: Record<string, any>, requestId?: string): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: "warn",
			message,
			requestId,
			data,
			service: "fil-rouge-server",
		}

		console.warn("WARN:", this.formatLogEntry(entry).trim())
		this.writeToFile("warn", this.formatLogEntry(entry))
	}

	/**
	 * Log d'erreur
	 */
	error(message: string, data?: Record<string, any>, requestId?: string): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: "error",
			message,
			requestId,
			data,
			service: "fil-rouge-server",
		}

		console.error("ERROR:", this.formatLogEntry(entry).trim())
		this.writeToFile("error", this.formatLogEntry(entry))
	}

	/**
	 * Log de debug
	 */
	debug(message: string, data?: Record<string, any>, requestId?: string): void {
		if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
			const entry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: "debug",
				message,
				requestId,
				data,
				service: "fil-rouge-server",
			}

			console.debug("DEBUG:", this.formatLogEntry(entry).trim())
			this.writeToFile("debug", this.formatLogEntry(entry))
		}
	}

	/**
	 * Log spécialisé pour les requêtes HTTP
	 */
	logRequest(data: { method: string; path: string; statusCode: number; responseTime: number; ip: string; userAgent: string; requestId: string; isError?: boolean }): void {
		// Filtrer les routes de monitoring et d'anomalies des logs internes
		if (data.path.includes("/monitoring") || data.path.includes("/anomalies")) {
			return
		}

		const level = data.isError ? "error" : data.responseTime > 1000 ? "warn" : "info"
		const message = `${data.method} ${data.path} - ${data.statusCode} (${data.responseTime}ms)`

		const logData = {
			type: "http_request",
			method: data.method,
			path: data.path,
			statusCode: data.statusCode,
			responseTime: data.responseTime,
			ip: data.ip,
			userAgent: data.userAgent,
		}

		if (level === "error") {
			this.error(message, logData, data.requestId)
		} else if (level === "warn") {
			this.warn(message, logData, data.requestId)
		} else {
			this.info(message, logData, data.requestId)
		}
	}

	/**
	 * Log spécialisé pour la sécurité
	 */
	logSecurity(event: string, data: Record<string, any>, requestId?: string): void {
		const message = `Security Event: ${event}`

		const logData = {
			type: "security_event",
			event,
			...data,
		}

		this.warn(message, logData, requestId)
	}

	/**
	 * Log spécialisé pour les métriques business
	 */
	logBusiness(action: string, data: Record<string, any>, requestId?: string): void {
		const message = `Business Event: ${action}`

		const logData = {
			type: "business_event",
			action,
			...data,
		}

		this.info(message, logData, requestId)
	}

	/**
	 * Récupère les logs récents d'un fichier
	 */
	getRecentLogs(level: "info" | "warn" | "error" | "debug", lines: number = 100): string[] {
		try {
			const filePath = this.getLogFilePath(level)
			if (!existsSync(filePath)) {
				return []
			}

			// Lecture simple - en production, utiliser des outils comme tail
			const content = readFileSync(filePath, "utf8")
			const allLines = content.split("\n").filter((line: string) => line.trim())

			return allLines.slice(-lines)
		} catch (error) {
			console.error("Erreur lecture logs:", error)
			return []
		}
	}

	/**
	 * Recherche dans les logs par requestId
	 */
	findLogsByRequestId(requestId: string): LogEntry[] {
		const results: LogEntry[] = []
		const levels = ["info", "warn", "error", "debug"]

		for (const level of levels) {
			try {
				const logs = this.getRecentLogs(level as any, 1000)
				for (const logLine of logs) {
					const entry: LogEntry = JSON.parse(logLine)
					if (entry.requestId === requestId) {
						results.push(entry)
					}
				}
			} catch (error) {
				// Ignore parsing errors
			}
		}

		return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
	}

	/**
	 * API pour récupérer un résumé des logs
	 */
	getLogsSummary(hours: number = 24): {
		total: number
		errors: number
		warnings: number
		info: number
		requests: number
		avgResponseTime: number
	} {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
		let total = 0,
			errors = 0,
			warnings = 0,
			info = 0,
			requests = 0
		let totalResponseTime = 0,
			responseTimeCount = 0

		const allLogs = [...this.getRecentLogs("info", 1000), ...this.getRecentLogs("warn", 1000), ...this.getRecentLogs("error", 1000)]

		for (const logLine of allLogs) {
			try {
				const entry = JSON.parse(logLine)
				const logTime = new Date(entry.timestamp)

				if (logTime >= cutoff) {
					total++

					switch (entry.level) {
						case "error":
							errors++
							break
						case "warn":
							warnings++
							break
						case "info":
							info++
							break
					}

					if (entry.type === "http_request") {
						requests++
						if (entry.responseTime) {
							totalResponseTime += entry.responseTime
							responseTimeCount++
						}
					}
				}
			} catch (error) {
				// Ignore parsing errors
			}
		}

		return {
			total,
			errors,
			warnings,
			info,
			requests,
			avgResponseTime: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0,
		}
	}
}

export default new LoggerService()
