import { AlertConfig } from "./MonitoringService"
import AnomalyService from "./AnomalyService"

export interface AlertChannel {
	type: "email" | "webhook" | "sms" | "slack"
	config: Record<string, any>
	enabled: boolean
}

export interface AlertRule {
	id: string
	name: string
	condition: AlertCondition
	channels: string[] // IDs des canaux à utiliser
	cooldown: number // en minutes
	enabled: boolean
}

export interface AlertCondition {
	metric: string
	operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq"
	threshold: number
	duration?: number // en secondes
}

export interface AlertHistory {
	id: string
	alertId: string
	timestamp: string
	message: string
	severity: "critical" | "warning" | "info"
	status: "triggered" | "resolved" | "acknowledged"
	channels: string[]
	metadata?: Record<string, any>
}

export class AlertService {
	private channels: Map<string, AlertChannel> = new Map()
	private rules: Map<string, AlertRule> = new Map()
	private history: AlertHistory[] = []
	private lastAlerts: Map<string, number> = new Map()

	constructor() {
		this.initializeDefaultChannels()
		this.initializeDefaultRules()
	}

	init(): void {
		setInterval(() => this.checkAlerts(), 30000)
		console.log("🤖 AlertService initialisé - Vérification automatique des anomalies toutes les 30s")
	}

	private initializeDefaultChannels(): void {
		this.channels.set("email-ops", {
			type: "email",
			config: {
				smtp: {
					host: process.env.SMTP_HOST || "localhost",
					port: parseInt(process.env.SMTP_PORT || "587"),
					secure: false,
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				},
				from: process.env.ALERT_EMAIL_FROM || "alerts@filrouge.com",
				to: process.env.ALERT_EMAIL_TO?.split(",") || ["ops@filrouge.com"],
			},
			enabled: true,
		})

		this.channels.set("slack-alerts", {
			type: "webhook",
			config: {
				url: process.env.SLACK_WEBHOOK_URL,
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			enabled: !!process.env.SLACK_WEBHOOK_URL,
		})

		this.channels.set("sms-critical", {
			type: "sms",
			config: {
				provider: "twilio",
				accountSid: process.env.TWILIO_ACCOUNT_SID,
				authToken: process.env.TWILIO_AUTH_TOKEN,
				from: process.env.TWILIO_PHONE_NUMBER,
				to: process.env.ALERT_SMS_TO?.split(",") || [],
			},
			enabled: !!process.env.TWILIO_ACCOUNT_SID,
		})

		this.channels.set("webhook-monitoring", {
			type: "webhook",
			config: {
				url: process.env.MONITORING_WEBHOOK_URL,
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			enabled: !!process.env.MONITORING_WEBHOOK_URL,
		})
	}

	private initializeDefaultRules(): void {
		this.rules.set("service-unhealthy", {
			id: "service-unhealthy",
			name: "Service Indisponible",
			condition: {
				metric: "service_status",
				operator: "eq",
				threshold: 0, // unhealthy = 0
			},
			channels: ["email-ops", "slack-alerts", "sms-critical"],
			cooldown: 5, // 5 minutes
			enabled: true,
		})

		this.rules.set("memory-critical", {
			id: "memory-critical",
			name: "Utilisation Mémoire Critique",
			condition: {
				metric: "memory_usage_percent",
				operator: "gt",
				threshold: 95,
			},
			channels: ["email-ops", "slack-alerts"],
			cooldown: 10,
			enabled: true,
		})

		this.rules.set("response-time-high", {
			id: "response-time-high",
			name: "Temps de Réponse Élevé",
			condition: {
				metric: "response_time_ms",
				operator: "gt",
				threshold: 2000,
				duration: 120,
			},
			channels: ["slack-alerts"],
			cooldown: 15,
			enabled: true,
		})

		this.rules.set("error-rate-high", {
			id: "error-rate-high",
			name: "Taux d'Erreur Élevé",
			condition: {
				metric: "error_rate_percent",
				operator: "gt",
				threshold: 5,
			},
			channels: ["email-ops", "slack-alerts"],
			cooldown: 10,
			enabled: true,
		})

		this.rules.set("auth-failures", {
			id: "auth-failures",
			name: "Échecs d'Authentification Massifs",
			condition: {
				metric: "auth_failures_per_minute",
				operator: "gt",
				threshold: 50,
			},
			channels: ["email-ops", "slack-alerts", "sms-critical"],
			cooldown: 5,
			enabled: true,
		})

		this.rules.set("cpu-usage-high", {
			id: "cpu-usage-high",
			name: "Utilisation CPU Élevée",
			condition: {
				metric: "cpu_usage_percent",
				operator: "gt",
				threshold: 85,
				duration: 60,
			},
			channels: ["email-ops", "slack-alerts"],
			cooldown: 10,
			enabled: true,
		})

		this.rules.set("cpu-usage-critical", {
			id: "cpu-usage-critical",
			name: "Utilisation CPU Critique",
			condition: {
				metric: "cpu_usage_percent",
				operator: "gt",
				threshold: 95,
			},
			channels: ["email-ops", "slack-alerts", "sms-critical"],
			cooldown: 5,
			enabled: true,
		})
	}

	async processAlert(alert: AlertConfig): Promise<void> {
		try {
			const alertKey = `${alert.service}_${alert.metric}`
			const now = Date.now()

			const getCooldownDuration = (alert: AlertConfig): number => {
				const baseCooldown = 5 * 60 * 1000

				switch (alert.metric) {
					case "diskSpace":
					case "connections":
						return 15 * 60 * 1000
					case "errorPattern":
					case "errorRate":
						return 2 * 60 * 1000
					case "performanceTrend":
						return 10 * 60 * 1000
					case "memory":
					case "cpu_usage_percent":
					case "responseTime":
						return baseCooldown
					default:
						return baseCooldown
				}
			}

			const lastAlert = this.lastAlerts.get(alertKey)
			const cooldownDuration = getCooldownDuration(alert)

			if (lastAlert && now - lastAlert < cooldownDuration) {
				console.log(`⏳ Alerte ${alertKey} en période de cooldown (${Math.ceil((cooldownDuration - (now - lastAlert)) / 60000)}min restantes)`)
				return
			}

			this.lastAlerts.set(alertKey, now)

			const channels = this.getChannelsForSeverity(alert.type)

			const message = this.formatAlertMessage(alert)

			const notifications = channels.map((channelId) => this.sendNotification(channelId, message, alert))

			await Promise.allSettled(notifications)

			try {
				await AnomalyService.logAnomalyFromAlert(alert, {
					alertChannels: channels,
					notificationSent: true,
					alertProcessedAt: new Date().toISOString(),
				})
				console.log(`🔍 Anomalie automatiquement consignée pour l'alerte: ${alertKey}`)
			} catch (error) {
				console.error("Erreur lors de la consignation de l'anomalie:", error)
			}

			this.history.push({
				id: this.generateAlertId(),
				alertId: alertKey,
				timestamp: alert.timestamp,
				message: alert.message,
				severity: alert.type,
				status: "triggered",
				channels,
				metadata: {
					service: alert.service,
					metric: alert.metric,
					threshold: alert.threshold,
					currentValue: alert.currentValue,
				},
			})

			if (this.history.length > 1000) {
				this.history = this.history.slice(-1000)
			}
		} catch (error) {
			console.error("Erreur lors du traitement de l'alerte:", error)
		}
	}

	private async checkAlerts(): Promise<void> {
		try {
			const { default: MonitoringService } = await import("./MonitoringService")

			const alerts = await MonitoringService.checkThresholds()

			if (alerts.length > 0) {
				console.log(`🔍 Détection automatique: ${alerts.length} anomalie(s) trouvée(s)`)

				for (const alert of alerts) {
					console.log(`  ⚠️ ${alert.type.toUpperCase()}: ${alert.message} (${alert.service}/${alert.metric}: ${alert.currentValue} > ${alert.threshold})`)
					await this.processAlert(alert)
				}
			}
		} catch (error) {
			console.error("❌ Erreur lors de la vérification des alertes:", error)
		}
	}

	private async sendNotification(channelId: string, message: string, alert: AlertConfig): Promise<void> {
		const channel = this.channels.get(channelId)

		if (!channel || !channel.enabled) {
			console.warn(`Canal ${channelId} non disponible ou désactivé`)
			return
		}

		try {
			switch (channel.type) {
				case "email":
					await this.sendEmailAlert(channel, message, alert)
					break
				case "webhook":
					await this.sendWebhookAlert(channel, message, alert)
					break
				case "sms":
					await this.sendSMSAlert(channel, message, alert)
					break
				case "slack":
					await this.sendSlackAlert(channel, message, alert)
					break
				default:
					console.warn(`Type de canal non supporté: ${channel.type}`)
			}

			console.log(`Notification envoyée via ${channel.type} (${channelId})`)
		} catch (error) {
			console.error(`Erreur envoi notification ${channelId}:`, error)
		}
	}

	private async sendEmailAlert(channel: AlertChannel, message: string, alert: AlertConfig): Promise<void> {
		// Simulation d'envoi d'email (nécessiterait nodemailer en vrai)
		console.log("EMAIL ALERT:", {
			to: channel.config.to,
			subject: `🚨 ${alert.type.toUpperCase()} - ${alert.service}`,
			body: message,
			alert,
		})
	}

	private async sendWebhookAlert(channel: AlertChannel, message: string, alert: AlertConfig): Promise<void> {
		if (!channel.config.url) return

		const payload = {
			text: message,
			alert: {
				service: alert.service,
				metric: alert.metric,
				severity: alert.type,
				threshold: alert.threshold,
				currentValue: alert.currentValue,
				timestamp: alert.timestamp,
			},
		}

		// Simulation d'envoi webhook
		console.log("WEBHOOK ALERT:", {
			url: channel.config.url,
			method: channel.config.method,
			payload,
		})
	}

	private async sendSMSAlert(channel: AlertChannel, message: string, alert: AlertConfig): Promise<void> {
		// Simulation d'envoi SMS (nécessiterait Twilio SDK en vrai)
		console.log("SMS ALERT:", {
			to: channel.config.to,
			message: `🚨 ${alert.service}: ${alert.message}`,
			alert,
		})
	}

	private async sendSlackAlert(channel: AlertChannel, message: string, alert: AlertConfig): Promise<void> {
		const color = alert.type === "critical" ? "danger" : alert.type === "warning" ? "warning" : "good"

		const slackPayload = {
			text: "Alerte Système",
			attachments: [
				{
					color,
					title: `${alert.type.toUpperCase()} - ${alert.service}`,
					text: message,
					fields: [
						{ title: "Métrique", value: alert.metric, short: true },
						{ title: "Seuil", value: alert.threshold.toString(), short: true },
						{ title: "Valeur actuelle", value: alert.currentValue.toString(), short: true },
						{ title: "Timestamp", value: alert.timestamp, short: true },
					],
					ts: Math.floor(Date.parse(alert.timestamp) / 1000),
				},
			],
		}

		console.log("SLACK ALERT:", slackPayload)
	}

	private getChannelsForSeverity(severity: string): string[] {
		switch (severity) {
			case "critical":
				return ["email-ops", "slack-alerts", "sms-critical", "webhook-monitoring"]
			case "warning":
				return ["email-ops", "slack-alerts", "webhook-monitoring"]
			case "info":
				return ["slack-alerts"]
			default:
				return ["slack-alerts"]
		}
	}

	private formatAlertMessage(alert: AlertConfig): string {
		const emoji = alert.type === "critical" ? "🔴" : alert.type === "warning" ? "🟠" : "🟡"

		return `${emoji} ALERTE ${alert.type.toUpperCase()} - Fil Rouge Server

Service: ${alert.service}
Métrique: ${alert.metric}
Message: ${alert.message}
Seuil: ${alert.threshold}
Valeur actuelle: ${alert.currentValue}
Timestamp: ${alert.timestamp}

Action requise: ${alert.type === "critical" ? "IMMÉDIATE" : "Surveillance"}

Dashboard: http://localhost:3001/monitoring/health
Métriques: http://localhost:3001/monitoring/metrics`
	}

	private generateAlertId(): string {
		return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	getAlertHistory(limit: number = 100): AlertHistory[] {
		return this.history.slice(-limit)
	}

	getActiveRules(): AlertRule[] {
		return Array.from(this.rules.values()).filter((rule) => rule.enabled)
	}

	getChannels(): AlertChannel[] {
		return Array.from(this.channels.values())
	}

	async testAlert(channelId: string): Promise<void> {
		const testAlert: AlertConfig = {
			type: "info",
			message: "Test d'alerte du système de monitoring",
			service: "test",
			metric: "test_metric",
			threshold: 100,
			currentValue: 150,
			timestamp: new Date().toISOString(),
		}

		await this.sendNotification(channelId, this.formatAlertMessage(testAlert), testAlert)
	}
}

export default new AlertService()
