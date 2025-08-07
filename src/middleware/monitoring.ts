import { Context, Next } from "hono"
import MonitoringService from "../services/MonitoringService"
import LoggerService from "../services/LoggerService"
import PrometheusMetricsService from "../services/PrometheusMetricsService"

/**
 * Middleware de monitoring pour capturer les métriques de requêtes
 * Enregistre automatiquement le temps de réponse, les erreurs et autres métriques
 */
export const monitoringMiddleware = async (c: Context, next: Next) => {
	const startTime = Date.now()
	const path = c.req.path
	const method = c.req.method
	const userAgent = c.req.header("user-agent") || "unknown"
	const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"

	// Headers de correlation pour traçabilité
	const requestId = c.req.header("x-request-id") || generateRequestId()

	// Ajoute l'ID de requête dans les headers de réponse
	c.header("x-request-id", requestId)

	try {
		// Exécute la requête
		await next()

		const responseTime = Date.now() - startTime
		const statusCode = c.res.status || 200
		const isError = statusCode >= 400

		// Enregistre les métriques
		MonitoringService.recordRequest(path, responseTime, isError)

		// Enregistre aussi dans Prometheus
		PrometheusMetricsService.recordHttpRequest(method, path, statusCode, responseTime)

		// Log structuré pour analyse
		const logData = {
			timestamp: new Date().toISOString(),
			requestId,
			method,
			path,
			statusCode,
			responseTime,
			userAgent,
			ip,
			isError,
		}

		// Log avec le service de logging structuré
		LoggerService.logRequest({
			method,
			path,
			statusCode,
			responseTime,
			ip,
			userAgent,
			requestId,
			isError,
		})

		// Métriques de sécurité
		if (isAuthenticationError(statusCode, path)) {
			logAuthFailure(ip, userAgent, path, requestId)
		}
	} catch (error) {
		const responseTime = Date.now() - startTime

		// Enregistre l'erreur
		MonitoringService.recordRequest(path, responseTime, true)

		// Enregistre aussi dans Prometheus
		PrometheusMetricsService.recordHttpRequest(method, path, 500, responseTime)

		// Log de l'erreur avec le service
		LoggerService.error(
			"Request Exception",
			{
				method,
				path,
				responseTime,
				userAgent,
				ip,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			},
			requestId
		)

		// Re-lance l'erreur pour que Hono puisse la gérer
		throw error
	}
}

/**
 * Middleware spécialisé pour les endpoints sensibles (authentification)
 */
export const securityMonitoringMiddleware = async (c: Context, next: Next) => {
	const startTime = Date.now()
	const path = c.req.path
	const method = c.req.method
	const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
	const userAgent = c.req.header("user-agent") || "unknown"

	// Vérifications de sécurité pré-requête
	if (isSupiciousRequest(c)) {
		console.warn("Suspicious Request Detected:", {
			timestamp: new Date().toISOString(),
			ip,
			userAgent,
			path,
			method,
			contentType: c.req.header("content-type"),
			referer: c.req.header("referer"),
		})
	}

	try {
		await next()

		const responseTime = Date.now() - startTime
		const statusCode = c.res.status || 200

		// Log spécifique pour la sécurité
		console.log("Security Event:", {
			timestamp: new Date().toISOString(),
			type: "auth_attempt",
			ip,
			userAgent,
			path,
			method,
			statusCode,
			responseTime,
			success: statusCode < 400,
		})
	} catch (error) {
		const responseTime = Date.now() - startTime

		console.error("Security Error:", {
			timestamp: new Date().toISOString(),
			type: "auth_error",
			ip,
			userAgent,
			path,
			method,
			responseTime,
			error: error instanceof Error ? error.message : "Unknown error",
		})

		throw error
	}
}

/**
 * Middleware pour tracker les métriques business
 */
export const businessMetricsMiddleware = async (c: Context, next: Next) => {
	const startTime = Date.now()
	const path = c.req.path
	const method = c.req.method

	// Identifie les actions business importantes
	const businessAction = identifyBusinessAction(path, method)

	if (businessAction) {
		console.log("Business Event Start:", {
			timestamp: new Date().toISOString(),
			action: businessAction,
			path,
			method,
			userId: extractUserId(c),
		})
	}

	try {
		await next()

		const responseTime = Date.now() - startTime
		const statusCode = c.res.status || 200

		if (businessAction) {
			console.log("Business Event Complete:", {
				timestamp: new Date().toISOString(),
				action: businessAction,
				path,
				method,
				statusCode,
				responseTime,
				success: statusCode < 400,
				userId: extractUserId(c),
			})
		}
	} catch (error) {
		const responseTime = Date.now() - startTime

		if (businessAction) {
			console.error("Business Event Error:", {
				timestamp: new Date().toISOString(),
				action: businessAction,
				path,
				method,
				responseTime,
				error: error instanceof Error ? error.message : "Unknown error",
				userId: extractUserId(c),
			})
		}

		throw error
	}
}

// Fonctions utilitaires

function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function isAuthenticationError(statusCode: number, path: string): boolean {
	return (statusCode === 401 || statusCode === 403) && (path.includes("/auth") || path.includes("/api"))
}

function logAuthFailure(ip: string, userAgent: string, path: string, requestId: string): void {
	console.warn("Authentication Failure:", {
		timestamp: new Date().toISOString(),
		type: "auth_failure",
		ip,
		userAgent,
		path,
		requestId,
		severity: "medium",
	})

	// TODO: Implémenter la détection de brute force
	// checkBruteForcePattern(ip, path)
}

function isSupiciousRequest(c: Context): boolean {
	const userAgent = c.req.header("user-agent") || ""
	const path = c.req.path

	// Détection simple de patterns suspects
	const suspiciousPatterns = [
		/sql|script|javascript|vbscript/i, // Injection attempts
		/\.\./, // Directory traversal
		/<script|<iframe|<object/i, // XSS attempts
		/union\s+select/i, // SQL injection
	]

	const suspiciousUserAgents = [/curl|wget|python|scanner|bot/i]

	return suspiciousPatterns.some((pattern) => pattern.test(path)) || suspiciousUserAgents.some((pattern) => pattern.test(userAgent))
}

function identifyBusinessAction(path: string, method: string): string | null {
	const businessActions: { [key: string]: string } = {
		"POST /api/auth/login": "user_login",
		"POST /api/auth/register": "user_registration",
		"POST /api/events": "event_creation",
		"POST /api/messages": "message_send",
		"POST /api/event-images": "image_upload",
		"PUT /api/events": "event_update",
		"DELETE /api/events": "event_deletion",
	}

	const actionKey = `${method} ${path}`
	return businessActions[actionKey] || null
}

function extractUserId(c: Context): string | null {
	try {
		// Extrait l'ID utilisateur du contexte (ajouté par le middleware d'auth)
		const user = c.get("user")
		return user?.id || null
	} catch {
		return null
	}
}

/**
 * Middleware de rate limiting avec monitoring
 */
export const rateLimitingMiddleware = (maxRequests: number = 100, windowMs: number = 60000) => {
	const requests = new Map<string, { count: number; resetTime: number }>()

	return async (c: Context, next: Next) => {
		const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"

		const now = Date.now()
		const windowStart = now - windowMs

		// Nettoie les anciennes entrées
		const keysToDelete: string[] = []
		requests.forEach((value, key) => {
			if (value.resetTime < windowStart) {
				keysToDelete.push(key)
			}
		})
		keysToDelete.forEach((key) => requests.delete(key))

		const current = requests.get(ip) || { count: 0, resetTime: now + windowMs }

		if (current.count >= maxRequests && current.resetTime > now) {
			console.warn("Rate Limit Exceeded:", {
				timestamp: new Date().toISOString(),
				ip,
				count: current.count,
				maxRequests,
				path: c.req.path,
			})

			return c.json(
				{
					error: "Rate limit exceeded",
					retryAfter: Math.ceil((current.resetTime - now) / 1000),
				},
				429
			)
		}

		current.count++
		requests.set(ip, current)

		await next()
	}
}

export default {
	monitoringMiddleware,
	securityMonitoringMiddleware,
	businessMetricsMiddleware,
	rateLimitingMiddleware,
}
