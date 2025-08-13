import { PrismaClient } from "@prisma/client"
import { AlertConfig } from "./MonitoringService"

export interface Anomaly {
	id: string
	title: string
	description: string
	severity: "critical" | "warning" | "info"
	status: "detected" | "investigating" | "resolved" | "closed"

	// Informations de détection
	detectedAt: string
	detectionMethod: "automatic" | "manual"
	source: string // Service ou composant source

	// Contexte technique
	service: string
	component?: string
	metric: string
	threshold: number
	currentValue: number

	// Données de contexte
	environment: string
	version?: string
	userImpact: "none" | "low" | "medium" | "high" | "critical"

	// Analyse et résolution
	rootCause?: string
	impact?: string
	recommendedActions: string[]
	appliedCorrectifs: CorrectifAction[]

	// Métadonnées
	tags: string[]
	metadata: Record<string, any>

	// Suivi temporel
	investigationStartedAt?: string
	resolvedAt?: string
	closedAt?: string

	// Assignation
	assignedTo?: string
	reporter: string

	// Liaisons
	relatedAnomalies: string[]
	alertIds: string[]
}

export interface CorrectifAction {
	id: string
	action: string
	description: string
	status: "planned" | "in_progress" | "completed" | "failed"
	priority: "low" | "medium" | "high" | "urgent"
	estimatedEffort: string // "5min", "2h", "1d", etc.
	category: "restart" | "config" | "scaling" | "monitoring" | "investigation" | "other"
	appliedAt?: string
	appliedBy?: string
	result?: string
	rollbackPlan?: string
}

export interface AnomalyPattern {
	pattern: string
	description: string
	commonCauses: string[]
	recommendedActions: string[]
	preventiveMeasures: string[]
}

export interface AnomalyStats {
	total: number
	byStatus: Record<string, number>
	bySeverity: Record<string, number>
	byService: Record<string, number>
	avgResolutionTime: number
	totalResolvedThisWeek: number
	criticalOpen: number
}

export class AnomalyService {
	private prisma: PrismaClient
	private anomalies: Map<string, Anomaly> = new Map()
	private patterns: Map<string, AnomalyPattern> = new Map()

	constructor() {
		this.prisma = new PrismaClient()
		this.initializePatterns()

		// Nettoyage périodique des anomalies anciennes
		setInterval(() => this.cleanupOldAnomalies(), 24 * 60 * 60 * 1000) // Tous les jours
	}

	/**
	 * Initialise les patterns d'anomalies connues avec leurs correctifs
	 */
	private initializePatterns(): void {
		this.patterns.set("high_memory_usage", {
			pattern: "Utilisation mémoire élevée",
			description: "Consommation mémoire au-dessus des seuils normaux",
			commonCauses: ["Fuite mémoire dans l'application", "Charge de travail inhabituelle", "Configuration inadéquate", "Processus zombies"],
			recommendedActions: [
				"Analyser les processus consommateurs",
				"Vérifier les logs d'application",
				"Redémarrer les services si nécessaire",
				"Ajuster les limites mémoire",
				"Optimiser les requêtes base de données",
			],
			preventiveMeasures: ["Monitoring proactif", "Tests de charge réguliers", "Profiling de performance", "Alertes préventives"],
		})

		this.patterns.set("high_response_time", {
			pattern: "Temps de réponse élevé",
			description: "Latence API ou service au-dessus des seuils acceptables",
			commonCauses: ["Surcharge base de données", "Ressources insuffisantes", "Requêtes non optimisées", "Problèmes réseau", "Services externes lents"],
			recommendedActions: [
				"Analyser les requêtes lentes",
				"Vérifier l'état de la base de données",
				"Contrôler les connexions réseau",
				"Redémarrer les services dégradés",
				"Ajuster la mise à l'échelle",
			],
			preventiveMeasures: ["Optimisation des index", "Cache applicatif", "Load balancing", "Monitoring des dépendances"],
		})

		this.patterns.set("service_unavailable", {
			pattern: "Service indisponible",
			description: "Service critique non accessible ou non fonctionnel",
			commonCauses: ["Crash de l'application", "Problème de configuration", "Ressources système épuisées", "Dépendance externe indisponible", "Problème réseau"],
			recommendedActions: [
				"Redémarrer le service immédiatement",
				"Vérifier les logs d'erreur",
				"Contrôler les dépendances",
				"Basculer vers un mode dégradé",
				"Notifier les équipes concernées",
			],
			preventiveMeasures: ["Health checks automatiques", "Retry automatique", "Circuit breaker pattern", "Redondance des services"],
		})

		this.patterns.set("high_error_rate", {
			pattern: "Taux d'erreur élevé",
			description: "Augmentation significative des erreurs applicatives",
			commonCauses: ["Bug récemment introduit", "Configuration incorrecte", "Données corrompues", "Intégration externe défaillante", "Surcharge système"],
			recommendedActions: [
				"Analyser les logs d'erreur récents",
				"Rollback du dernier déploiement si nécessaire",
				"Vérifier les configurations",
				"Tester les intégrations externes",
				"Activer le mode maintenance si critique",
			],
			preventiveMeasures: ["Tests automatisés robustes", "Déploiement progressif", "Monitoring des métriques business", "Validation des données"],
		})

		this.patterns.set("database_connection_issues", {
			pattern: "Problèmes de connexion base de données",
			description: "Difficultés d'accès ou de performance de la base de données",
			commonCauses: ["Pool de connexions saturé", "Base de données surchargée", "Problème réseau", "Maintenance ou lock de tables", "Configuration de timeout inadéquate"],
			recommendedActions: [
				"Vérifier l'état du serveur de base de données",
				"Analyser les connexions actives",
				"Redémarrer le pool de connexions",
				"Optimiser les requêtes en cours",
				"Ajuster les timeouts si nécessaire",
			],
			preventiveMeasures: ["Monitoring des connexions DB", "Pool de connexions dimensionné", "Requêtes optimisées", "Health checks de la DB"],
		})
	}

	/**
	 * Consigne une nouvelle anomalie détectée automatiquement
	 */
	async logAnomalyFromAlert(alert: AlertConfig, additionalContext?: Record<string, any>): Promise<Anomaly> {
		const anomaly: Anomaly = {
			id: this.generateAnomalyId(),
			title: `Anomalie détectée: ${alert.message}`,
			description: this.generateDescription(alert),
			severity: alert.type,
			status: "detected",

			detectedAt: alert.timestamp,
			detectionMethod: "automatic",
			source: "MonitoringService",

			service: alert.service,
			component: this.extractComponent(alert),
			metric: alert.metric,
			threshold: alert.threshold,
			currentValue: alert.currentValue,

			environment: process.env.NODE_ENV || "development",
			version: process.env.APP_VERSION || "1.0.0",
			userImpact: this.evaluateUserImpact(alert),

			recommendedActions: this.getRecommendedActions(alert),
			appliedCorrectifs: [],

			tags: this.generateTags(alert),
			metadata: {
				originalAlert: alert,
				detectionRules: this.getApplicableRules(alert),
				...additionalContext,
			},

			reporter: "system",
			relatedAnomalies: [],
			alertIds: [this.generateAlertReference(alert)],
		}

		// Sauvegarde l'anomalie
		this.anomalies.set(anomaly.id, anomaly)

		// Recherche les anomalies similaires
		const relatedAnomalies = this.findRelatedAnomalies(anomaly)
		if (relatedAnomalies.length > 0) {
			anomaly.relatedAnomalies = relatedAnomalies.map((a) => a.id)
		}

		console.log(`🔍 Anomalie consignée: ${anomaly.id} - ${anomaly.title}`)

		return anomaly
	}

	/**
	 * Consigne manuellement une anomalie
	 */
	async logManualAnomaly(data: {
		title: string
		description: string
		severity: "critical" | "warning" | "info"
		service: string
		component?: string
		reporter: string
		tags?: string[]
		metadata?: Record<string, any>
	}): Promise<Anomaly> {
		const anomaly: Anomaly = {
			id: this.generateAnomalyId(),
			title: data.title,
			description: data.description,
			severity: data.severity,
			status: "detected",

			detectedAt: new Date().toISOString(),
			detectionMethod: "manual",
			source: "ManualReport",

			service: data.service,
			component: data.component,
			metric: "manual_observation",
			threshold: 0,
			currentValue: 0,

			environment: process.env.NODE_ENV || "development",
			version: process.env.APP_VERSION || "1.0.0",
			userImpact: "medium", // Par défaut, à ajuster

			recommendedActions: this.getManualRecommendations(data),
			appliedCorrectifs: [],

			tags: data.tags || [],
			metadata: data.metadata || {},

			reporter: data.reporter,
			relatedAnomalies: [],
			alertIds: [],
		}

		this.anomalies.set(anomaly.id, anomaly)

		console.log(`📝 Anomalie manuelle consignée: ${anomaly.id} - ${anomaly.title}`)

		return anomaly
	}

	/**
	 * Met à jour le statut d'une anomalie
	 */
	async updateAnomalyStatus(anomalyId: string, status: Anomaly["status"], updatedBy: string, notes?: string): Promise<Anomaly | null> {
		const anomaly = this.anomalies.get(anomalyId)
		if (!anomaly) return null

		const previousStatus = anomaly.status
		anomaly.status = status

		// Met à jour les timestamps selon le statut
		const now = new Date().toISOString()
		switch (status) {
			case "investigating":
				if (!anomaly.investigationStartedAt) {
					anomaly.investigationStartedAt = now
				}
				break
			case "resolved":
				anomaly.resolvedAt = now
				break
			case "closed":
				anomaly.closedAt = now
				break
		}

		// Ajoute une note de suivi
		if (notes) {
			if (!anomaly.metadata.statusHistory) {
				anomaly.metadata.statusHistory = []
			}
			anomaly.metadata.statusHistory.push({
				timestamp: now,
				fromStatus: previousStatus,
				toStatus: status,
				updatedBy,
				notes,
			})
		}

		console.log(`📊 Anomalie ${anomalyId} mise à jour: ${previousStatus} → ${status}`)

		return anomaly
	}

	/**
	 * Applique un correctif à une anomalie
	 */
	async applyCorrectif(anomalyId: string, correctif: Omit<CorrectifAction, "id" | "appliedAt">, appliedBy: string): Promise<CorrectifAction | null> {
		const anomaly = this.anomalies.get(anomalyId)
		if (!anomaly) return null

		const correctifAction: CorrectifAction = {
			...correctif,
			id: this.generateCorrectifId(),
			appliedAt: new Date().toISOString(),
			appliedBy,
		}

		anomaly.appliedCorrectifs.push(correctifAction)

		// Met automatiquement l'anomalie en investigation si elle était en "detected"
		if (anomaly.status === "detected") {
			anomaly.status = "investigating"
			anomaly.investigationStartedAt = new Date().toISOString()
		}

		console.log(`🔧 Correctif appliqué sur ${anomalyId}: ${correctif.action}`)

		return correctifAction
	}

	/**
	 * Récupère les anomalies avec filtres
	 */
	async getAnomalies(filters?: {
		status?: Anomaly["status"][]
		severity?: Anomaly["severity"][]
		service?: string[]
		timeRange?: { start: string; end: string }
		limit?: number
		offset?: number
	}): Promise<{ anomalies: Anomaly[]; total: number }> {
		let filteredAnomalies = Array.from(this.anomalies.values())

		// Applique les filtres
		if (filters) {
			if (filters.status) {
				filteredAnomalies = filteredAnomalies.filter((a) => filters.status!.includes(a.status))
			}
			if (filters.severity) {
				filteredAnomalies = filteredAnomalies.filter((a) => filters.severity!.includes(a.severity))
			}
			if (filters.service) {
				filteredAnomalies = filteredAnomalies.filter((a) => filters.service!.includes(a.service))
			}
			if (filters.timeRange) {
				filteredAnomalies = filteredAnomalies.filter((a) => a.detectedAt >= filters.timeRange!.start && a.detectedAt <= filters.timeRange!.end)
			}
		}

		// Trie par date de détection (plus récent en premier)
		filteredAnomalies.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())

		const total = filteredAnomalies.length

		// Pagination
		if (filters?.limit) {
			const start = filters?.offset || 0
			filteredAnomalies = filteredAnomalies.slice(start, start + filters.limit)
		}

		return { anomalies: filteredAnomalies, total }
	}

	/**
	 * Récupère les statistiques des anomalies
	 */
	async getAnomalyStats(): Promise<AnomalyStats> {
		const anomalies = Array.from(this.anomalies.values())

		const byStatus = anomalies.reduce((acc, a) => {
			acc[a.status] = (acc[a.status] || 0) + 1
			return acc
		}, {} as Record<string, number>)

		const bySeverity = anomalies.reduce((acc, a) => {
			acc[a.severity] = (acc[a.severity] || 0) + 1
			return acc
		}, {} as Record<string, number>)

		const byService = anomalies.reduce((acc, a) => {
			acc[a.service] = (acc[a.service] || 0) + 1
			return acc
		}, {} as Record<string, number>)

		// Calcule le temps moyen de résolution
		const resolvedAnomalies = anomalies.filter((a) => a.resolvedAt)
		const avgResolutionTime =
			resolvedAnomalies.length > 0
				? resolvedAnomalies.reduce((acc, a) => {
						const detectedTime = new Date(a.detectedAt).getTime()
						const resolvedTime = new Date(a.resolvedAt!).getTime()
						return acc + (resolvedTime - detectedTime)
				  }, 0) /
				  resolvedAnomalies.length /
				  (60 * 1000) // en minutes
				: 0

		// Anomalies résolues cette semaine (seulement celles qui sont encore résolues)
		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
		const totalResolvedThisWeek = anomalies.filter((a) => a.resolvedAt && a.resolvedAt >= oneWeekAgo && a.status === "resolved").length

		// Compteur des anomalies critiques ouvertes (detected ou investigating)
		const criticalOpen = anomalies.filter((a) => a.severity === "critical" && (a.status === "detected" || a.status === "investigating")).length

		return {
			total: anomalies.length,
			byStatus,
			bySeverity,
			byService,
			avgResolutionTime: Math.round(avgResolutionTime),
			totalResolvedThisWeek,
			criticalOpen,
		}
	}

	/**
	 * Récupère une anomalie par ID
	 */
	async getAnomalyById(id: string): Promise<Anomaly | null> {
		return this.anomalies.get(id) || null
	}

	// Méthodes utilitaires privées

	private generateAnomalyId(): string {
		return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
	}

	private generateCorrectifId(): string {
		return `correctif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
	}

	private generateAlertReference(alert: AlertConfig): string {
		return `alert_${alert.service}_${alert.metric}_${Date.now()}`
	}

	private generateDescription(alert: AlertConfig): string {
		return `Anomalie détectée automatiquement sur le service ${alert.service}. 
		Métrique ${alert.metric}: valeur actuelle ${alert.currentValue} dépasse le seuil configuré de ${alert.threshold}.
		Message d'alerte: ${alert.message}`
	}

	private extractComponent(alert: AlertConfig): string | undefined {
		// Essaie d'extraire le composant depuis les informations de l'alerte
		if (alert.metric.includes("database")) return "database"
		if (alert.metric.includes("storage")) return "storage"
		if (alert.metric.includes("memory")) return "memory"
		if (alert.metric.includes("cpu")) return "cpu"
		if (alert.metric.includes("network")) return "network"
		return undefined
	}

	private evaluateUserImpact(alert: AlertConfig): Anomaly["userImpact"] {
		// Évalue l'impact utilisateur basé sur la sévérité et le service
		if (alert.type === "critical") {
			if (alert.service === "application" || alert.service === "database") {
				return "critical"
			}
			return "high"
		}
		if (alert.type === "warning") {
			return "medium"
		}
		return "low"
	}

	private getRecommendedActions(alert: AlertConfig): string[] {
		const patternKey = this.detectPattern(alert)
		const pattern = this.patterns.get(patternKey)

		if (pattern) {
			return pattern.recommendedActions
		}

		// Actions génériques par défaut
		return ["Analyser les logs du service concerné", "Vérifier l'état des ressources système", "Contrôler les dépendances externes", "Considérer un redémarrage si nécessaire"]
	}

	private getManualRecommendations(data: any): string[] {
		// Recommandations basiques pour les anomalies manuelles
		return ["Analyser la cause racine du problème", "Documenter les étapes de reproduction", "Évaluer l'impact sur les utilisateurs", "Planifier les actions correctives"]
	}

	private detectPattern(alert: AlertConfig): string {
		// Détecte le pattern d'anomalie basé sur les informations de l'alerte
		if (alert.metric.includes("memory")) return "high_memory_usage"
		if (alert.metric.includes("response") || alert.metric.includes("latency")) return "high_response_time"
		if (alert.metric.includes("availability") || alert.metric.includes("health")) return "service_unavailable"
		if (alert.metric.includes("error") || alert.metric.includes("failure")) return "high_error_rate"
		if (alert.metric.includes("database") || alert.metric.includes("connection")) return "database_connection_issues"

		return "unknown_pattern"
	}

	private generateTags(alert: AlertConfig): string[] {
		const tags = [alert.service, alert.metric, alert.type]

		// Ajoute des tags contextuels
		if (alert.metric.includes("database")) tags.push("database")
		if (alert.metric.includes("memory")) tags.push("performance")
		if (alert.metric.includes("network")) tags.push("connectivity")
		if (alert.type === "critical") tags.push("urgent")

		return tags
	}

	private getApplicableRules(alert: AlertConfig): string[] {
		// Retourne les règles de détection qui s'appliquent à cette alerte
		return [`threshold_${alert.metric}`, `service_${alert.service}`]
	}

	private findRelatedAnomalies(anomaly: Anomaly): Anomaly[] {
		// Trouve les anomalies similaires récentes (dernières 24h)
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

		return Array.from(this.anomalies.values()).filter(
			(existing) =>
				existing.id !== anomaly.id &&
				existing.detectedAt >= oneDayAgo &&
				(existing.service === anomaly.service || existing.metric === anomaly.metric || existing.component === anomaly.component)
		)
	}

	private cleanupOldAnomalies(): void {
		// Supprime les anomalies closes de plus de 30 jours
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

		Array.from(this.anomalies.entries()).forEach(([id, anomaly]) => {
			if (anomaly.status === "closed" && anomaly.closedAt && anomaly.closedAt < thirtyDaysAgo) {
				this.anomalies.delete(id)
				console.log(`🧹 Anomalie ancienne supprimée: ${id}`)
			}
		})
	}
}

export default new AnomalyService()
