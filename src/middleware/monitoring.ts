import { Context, Next } from "hono"
import MonitoringService from "../services/MonitoringService"
import LoggerService from "../services/LoggerService"
import PrometheusMetricsService from "../services/PrometheusMetricsService"

// Store pour la détection de brute force
interface BruteForceAttempt {
	ip: string
	path: string
	attempts: number
	firstAttempt: number
	lastAttempt: number
	blocked: boolean
	blockedUntil?: number
}

// Cache en mémoire pour les tentatives de brute force
const bruteForceStore = new Map<string, BruteForceAttempt>()

// Configuration de la détection de brute force
const BRUTE_FORCE_CONFIG = {
	maxAttempts: 5, // Max tentatives en 15 minutes
	timeWindow: 15 * 60 * 1000, // 15 minutes en millisecondes
	blockDuration: 30 * 60 * 1000, // 30 minutes de blocage
	cleanupInterval: 60 * 60 * 1000, // Nettoyage toutes les heures
}

// Nettoyage périodique du cache
setInterval(() => {
	const now = Date.now()
	const keysToDelete: string[] = []
	
	bruteForceStore.forEach((attempt, key) => {
		// Marquer les entrées expirées pour suppression
		if (
			(!attempt.blocked && now - attempt.lastAttempt > BRUTE_FORCE_CONFIG.timeWindow) ||
			(attempt.blocked && attempt.blockedUntil && now > attempt.blockedUntil)
		) {
			keysToDelete.push(key)
		}
	})
	
	// Supprimer les entrées expirées
	keysToDelete.forEach(key => bruteForceStore.delete(key))
}, BRUTE_FORCE_CONFIG.cleanupInterval)

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

export function logAuthFailure(ip: string, userAgent: string, path: string, requestId: string): void {
	console.warn("Authentication Failure:", {
		timestamp: new Date().toISOString(),
		type: "auth_failure",
		ip,
		userAgent,
		path,
		requestId,
		severity: "medium",
	})

	// Détection de brute force
	checkBruteForcePattern(ip, path, requestId)
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

/**
 * Fonction de détection et blocage des attaques brute force
 */
function checkBruteForcePattern(ip: string, path: string, requestId: string): void {
	const now = Date.now()
	const key = `${ip}:${path}`
	
	// Récupérer ou créer l'entrée pour cette IP/path
	let attempt = bruteForceStore.get(key)
	
	if (!attempt) {
		// Première tentative pour cette IP/path
		attempt = {
			ip,
			path,
			attempts: 1,
			firstAttempt: now,
			lastAttempt: now,
			blocked: false,
		}
		bruteForceStore.set(key, attempt)
		return
	}
	
	// Vérifier si le blocage est encore actif
	if (attempt.blocked && attempt.blockedUntil && now < attempt.blockedUntil) {
		console.error("🚫 Tentative d'accès bloquée (brute force):", {
			timestamp: new Date().toISOString(),
			type: "brute_force_blocked",
			ip,
			path,
			requestId,
			attempts: attempt.attempts,
			remainingBlockTime: Math.ceil((attempt.blockedUntil - now) / 1000),
			severity: "critical",
		})
		return
	}
	
	// Réinitialiser si la fenêtre de temps est expirée
	if (now - attempt.firstAttempt > BRUTE_FORCE_CONFIG.timeWindow) {
		attempt.attempts = 1
		attempt.firstAttempt = now
		attempt.lastAttempt = now
		attempt.blocked = false
		attempt.blockedUntil = undefined
		bruteForceStore.set(key, attempt)
		return
	}
	
	// Incrémenter les tentatives
	attempt.attempts++
	attempt.lastAttempt = now
	
	// Vérifier si le seuil est dépassé
	if (attempt.attempts >= BRUTE_FORCE_CONFIG.maxAttempts) {
		attempt.blocked = true
		attempt.blockedUntil = now + BRUTE_FORCE_CONFIG.blockDuration
		
		console.error("🚨 BRUTE FORCE DÉTECTÉ - IP BLOQUÉE:", {
			timestamp: new Date().toISOString(),
			type: "brute_force_detected",
			ip,
			path,
			requestId,
			attempts: attempt.attempts,
			timeWindow: BRUTE_FORCE_CONFIG.timeWindow / 1000 / 60, // en minutes
			blockDuration: BRUTE_FORCE_CONFIG.blockDuration / 1000 / 60, // en minutes
			severity: "critical",
		})
		
		// Déclencher une alerte via le système d'anomalies
		try {
			const { default: AnomalyService } = require("../services/AnomalyService")
			AnomalyService.logManualAnomaly({
				title: `Attaque brute force détectée depuis ${ip}`,
				description: `Détection de ${attempt.attempts} tentatives d'authentification échec sur ${path} en ${BRUTE_FORCE_CONFIG.timeWindow / 1000 / 60} minutes. IP automatiquement bloquée.`,
				severity: "critical",
				service: "authentication",
				component: "brute-force-protection",
				reporter: "monitoring-middleware",
				tags: ["security", "brute-force", "auto-block"],
				metadata: {
					ip,
					path,
					attempts: attempt.attempts,
					timeWindow: BRUTE_FORCE_CONFIG.timeWindow,
					blockDuration: BRUTE_FORCE_CONFIG.blockDuration,
					detectionTime: now,
					requestId,
				},
			})
		} catch (error) {
			console.error("Erreur lors de la consignation de l'anomalie brute force:", error)
		}
	} else {
		// Log de warning pour les tentatives suspectes
		console.warn("⚠️ Tentatives d'authentification suspectes:", {
			timestamp: new Date().toISOString(),
			type: "suspicious_auth_attempts",
			ip,
			path,
			requestId,
			attempts: attempt.attempts,
			maxAttempts: BRUTE_FORCE_CONFIG.maxAttempts,
			severity: "warning",
		})
	}
	
	bruteForceStore.set(key, attempt)
}

/**
 * Middleware pour bloquer les IPs en brute force
 */
export const bruteForceProtectionMiddleware = async (c: Context, next: Next) => {
	const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
	const path = c.req.path
	const now = Date.now()
	
	// Vérifier seulement les endpoints d'authentification
	const authPaths = ["/api/auth/login", "/api/auth/register", "/admin/login"]
	if (!authPaths.some(authPath => path.includes(authPath))) {
		await next()
		return
	}
	
	const key = `${ip}:${path}`
	const attempt = bruteForceStore.get(key)
	
	if (attempt?.blocked && attempt.blockedUntil && now < attempt.blockedUntil) {
		const remainingTime = Math.ceil((attempt.blockedUntil - now) / 1000)
		
		console.error("🚫 Requête bloquée (IP en brute force):", {
			timestamp: new Date().toISOString(),
			ip,
			path,
			remainingBlockTime: remainingTime,
		})
		
		return c.json(
			{
				error: "IP temporairement bloquée pour tentatives répétées",
				retryAfter: remainingTime,
				message: "Trop de tentatives d'authentification échouées. Réessayez plus tard.",
			},
			429
		)
	}
	
	await next()
}

export default {
	monitoringMiddleware,
	securityMonitoringMiddleware,
	businessMetricsMiddleware,
	rateLimitingMiddleware,
	bruteForceProtectionMiddleware,
}
