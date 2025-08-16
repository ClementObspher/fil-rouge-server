import { Context, Hono } from "hono"
import AnomalyService from "../services/AnomalyService"
import { adminAuthMiddleware } from "../middleware/adminAuth"

const app = new Hono()

app.use("*", adminAuthMiddleware)

app.get("/", async (c: Context) => {
	try {
		const query = c.req.query()
		const { status, severity, service, startDate, endDate, limit = "50", offset = "0" } = query

		const filters: any = {}

		if (status) {
			filters.status = Array.isArray(status) ? status : [status]
		}
		if (severity) {
			filters.severity = Array.isArray(severity) ? severity : [severity]
		}
		if (service) {
			filters.service = Array.isArray(service) ? service : [service]
		}
		if (startDate && endDate) {
			filters.timeRange = {
				start: startDate as string,
				end: endDate as string,
			}
		}

		filters.limit = parseInt(limit as string)
		filters.offset = parseInt(offset as string)

		const result = await AnomalyService.getAnomalies(filters)

		return c.json({
			success: true,
			data: {
				anomalies: result.anomalies,
				total: result.total,
				limit: filters.limit,
				offset: filters.offset,
			},
		})
	} catch (error) {
		console.error("Erreur lors de la récupération des anomalies:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la récupération des anomalies",
			},
			500
		)
	}
})

app.get("/stats", async (c: Context) => {
	try {
		const stats = await AnomalyService.getAnomalyStats()

		return c.json({
			success: true,
			data: stats,
		})
	} catch (error) {
		console.error("Erreur lors de la récupération des statistiques:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la récupération des statistiques",
			},
			500
		)
	}
})

app.get("/:id", async (c: Context) => {
	try {
		const { id } = c.req.param()
		const anomaly = await AnomalyService.getAnomalyById(id)

		if (!anomaly) {
			return c.json(
				{
					success: false,
					message: "Anomalie non trouvée",
				},
				404
			)
		}

		return c.json({
			success: true,
			data: anomaly,
		})
	} catch (error) {
		console.error("Erreur lors de la récupération de l'anomalie:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la récupération de l'anomalie",
			},
			500
		)
	}
})

app.post("/", async (c: Context) => {
	try {
		const body = await c.req.json()
		const { title, description, severity, service, component, tags, metadata } = body

		if (!title || !description || !severity || !service) {
			return c.json(
				{
					success: false,
					message: "Les champs title, description, severity et service sont requis",
				},
				400
			)
		}

		if (!["critical", "warning", "info"].includes(severity)) {
			return c.json(
				{
					success: false,
					message: "La sévérité doit être 'critical', 'warning' ou 'info'",
				},
				400
			)
		}

		const user = c.get("user")
		const anomaly = await AnomalyService.logManualAnomaly({
			title,
			description,
			severity,
			service,
			component,
			reporter: user?.username || "admin",
			tags: tags || [],
			metadata: metadata || {},
		})

		return c.json(
			{
				success: true,
				message: "Anomalie créée avec succès",
				data: anomaly,
			},
			201
		)
	} catch (error) {
		console.error("Erreur lors de la création de l'anomalie:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la création de l'anomalie",
			},
			500
		)
	}
})

app.patch("/:id/status", async (c: Context) => {
	try {
		const { id } = c.req.param()
		const body = await c.req.json()
		const { status, notes } = body

		if (!["detected", "investigating", "resolved", "closed"].includes(status)) {
			return c.json(
				{
					success: false,
					message: "Le statut doit être 'detected', 'investigating', 'resolved' ou 'closed'",
				},
				400
			)
		}

		const user = c.get("user")
		const anomaly = await AnomalyService.updateAnomalyStatus(id, status, user?.username || "admin", notes)

		if (!anomaly) {
			return c.json(
				{
					success: false,
					message: "Anomalie non trouvée",
				},
				404
			)
		}

		return c.json({
			success: true,
			message: "Statut de l'anomalie mis à jour avec succès",
			data: anomaly,
		})
	} catch (error) {
		console.error("Erreur lors de la mise à jour du statut:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de la mise à jour du statut",
			},
			500
		)
	}
})

app.post("/:id/correctifs", async (c: Context) => {
	try {
		const { id } = c.req.param()
		const body = await c.req.json()
		const { action, description, priority = "medium", estimatedEffort, category = "other", rollbackPlan } = body

		if (!action || !description) {
			return c.json(
				{
					success: false,
					message: "Les champs action et description sont requis",
				},
				400
			)
		}

		if (!["low", "medium", "high", "urgent"].includes(priority)) {
			return c.json(
				{
					success: false,
					message: "La priorité doit être 'low', 'medium', 'high' ou 'urgent'",
				},
				400
			)
		}

		if (!["restart", "config", "scaling", "monitoring", "investigation", "other"].includes(category)) {
			return c.json(
				{
					success: false,
					message: "La catégorie doit être valide",
				},
				400
			)
		}

		const user = c.get("user")
		const correctif = await AnomalyService.applyCorrectif(
			id,
			{
				action,
				description,
				status: "planned",
				priority,
				estimatedEffort: estimatedEffort || "unknown",
				category,
				rollbackPlan,
			},
			user?.username || "admin"
		)

		if (!correctif) {
			return c.json(
				{
					success: false,
					message: "Anomalie non trouvée",
				},
				404
			)
		}

		return c.json(
			{
				success: true,
				message: "Correctif appliqué avec succès",
				data: correctif,
			},
			201
		)
	} catch (error) {
		console.error("Erreur lors de l'application du correctif:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de l'application du correctif",
			},
			500
		)
	}
})

app.get("/export/csv", async (c: Context) => {
	try {
		const query = c.req.query()
		const { status, severity, service, startDate, endDate } = query

		const filters: any = {}

		if (status) {
			filters.status = Array.isArray(status) ? status : [status]
		}
		if (severity) {
			filters.severity = Array.isArray(severity) ? severity : [severity]
		}
		if (service) {
			filters.service = Array.isArray(service) ? service : [service]
		}
		if (startDate && endDate) {
			filters.timeRange = {
				start: startDate as string,
				end: endDate as string,
			}
		}

		const result = await AnomalyService.getAnomalies(filters)

		const csvHeaders = [
			"ID",
			"Titre",
			"Description",
			"Sévérité",
			"Statut",
			"Service",
			"Composant",
			"Métrique",
			"Seuil",
			"Valeur Actuelle",
			"Impact Utilisateur",
			"Détecté Le",
			"Méthode Détection",
			"Reporter",
			"Actions Recommandées",
			"Tags",
		]

		const csvRows = result.anomalies.map((anomaly) => [
			anomaly.id,
			`"${anomaly.title.replace(/"/g, '""')}"`,
			`"${anomaly.description.replace(/"/g, '""')}"`,
			anomaly.severity,
			anomaly.status,
			anomaly.service,
			anomaly.component || "",
			anomaly.metric,
			anomaly.threshold,
			anomaly.currentValue,
			anomaly.userImpact,
			anomaly.detectedAt,
			anomaly.detectionMethod,
			anomaly.reporter,
			`"${anomaly.recommendedActions.join("; ").replace(/"/g, '""')}"`,
			`"${anomaly.tags.join(", ").replace(/"/g, '""')}"`,
		])

		const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

		c.header("Content-Type", "text/csv")
		c.header("Content-Disposition", `attachment; filename="anomalies_${new Date().toISOString().split("T")[0]}.csv"`)

		return c.body(csvContent)
	} catch (error) {
		console.error("Erreur lors de l'export CSV:", error)
		return c.json(
			{
				success: false,
				message: "Erreur serveur lors de l'export CSV",
			},
			500
		)
	}
})

export default app
