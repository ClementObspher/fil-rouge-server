import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import anomaly from "../src/routes/anomaly"
import { testUtils } from "./setup"
import AnomalyService from "../src/services/AnomalyService"
import adminAuth from "../src/routes/adminAuth"

describe("Routes anomalies", () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route("/admin", adminAuth)
		app.route("/api/anomalies", anomaly)
	})
	it("devrait récupérer toutes les anomalies", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})

		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const res = await app.request("/api/anomalies", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data).toHaveProperty("anomalies")
		expect(Array.isArray(data.data.anomalies)).toBe(true)
	})

	it("devrait rejeter l'accès sans authentification", async () => {
		const res = await app.request("/api/anomalies")

		expect(res.status).toBe(401)
	})

	it("devrait créer une nouvelle anomalie", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const anomalyData = {
			title: "Test Security Anomaly",
			description: "Test anomaly",
			severity: "critical",
			service: "test-service",
			reporter: "test-user",
			tags: ["test"],
			metadata: { test: "data" },
		}

		const res = await app.request("/api/anomalies", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(anomalyData),
		})

		expect(res.status).toBe(201)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data.title).toBe("Test Security Anomaly")
		expect(data.data.severity).toBe("critical")
	})

	it("devrait récupérer une anomalie spécifique", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		// Créer une anomalie de test
		const anomaly = await AnomalyService.logManualAnomaly({
			title: "Test Security Anomaly",
			description: "Test anomaly",
			severity: "critical",
			service: "test-service",
			reporter: "test-user",
			tags: ["test"],
			metadata: { test: "data" },
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const res = await app.request(`/api/anomalies/${anomaly.id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data.title).toBe("Test Security Anomaly")
		expect(data.data.severity).toBe("critical")
	})

	it("devrait retourner 404 pour une anomalie inexistante", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const res = await app.request("/api/anomalies/non-existent-id", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		expect(res.status).toBe(404)
	})

	it("devrait rejeter la création avec un type invalide", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const anomalyData = {
			title: "Test Invalid Anomaly",
			description: "Test anomaly",
			severity: "invalid" as any,
			service: "test-service",
			reporter: "test-user",
		}

		const res = await app.request("/api/anomalies", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(anomalyData),
		})

		expect(res.status).toBe(400)
		const data = await res.json()
		expect(data).toHaveProperty("success")
		expect(data.success).toBe(false)
		expect(data.message).toBe("La sévérité doit être 'critical', 'warning' ou 'info'")
	})

	it("devrait mettre à jour une anomalie existante", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})
		// Créer une anomalie à mettre à jour
		const anomaly = await AnomalyService.logManualAnomaly({
			title: "Test Security Anomaly",
			description: "Test anomaly",
			severity: "critical",
			service: "test-service",
			reporter: "test-user",
			tags: ["test"],
			metadata: { test: "data" },
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const updateData = {
			status: "resolved",
			notes: "Updated description",
		}

		const res = await app.request(`/api/anomalies/${anomaly.id}/status`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updateData),
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data.status).toBe("resolved")
	})

	it("devrait retourner 404 pour une anomalie inexistante lors de la mise à jour", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const updateData = {
			status: "resolved",
			notes: "Updated description",
		}

		const res = await app.request("/api/anomalies/non-existent-id", {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updateData),
		})

		expect(res.status).toBe(404)
	})

	it("devrait appliquer un correctif à une anomalie", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const anomaly = await AnomalyService.logManualAnomaly({
			title: "Test Security Anomaly",
			description: "Test anomaly",
			severity: "critical",
			service: "test-service",
			reporter: "test-user",
			tags: ["test"],
			metadata: { test: "data" },
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const correctifData = {
			action: "Restart service",
			description: "Restart the service to fix the anomaly",
			priority: "medium",
			estimatedEffort: "1h",
			category: "restart",
			rollbackPlan: "Rollback to the previous version",
		}

		const res = await app.request(`/api/anomalies/${anomaly.id}/correctifs`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(correctifData),
		})

		expect(res.status).toBe(201)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data.action).toBe("Restart service")
		expect(data.data.description).toBe("Restart the service to fix the anomaly")
		expect(data.data.priority).toBe("medium")
		expect(data.data.estimatedEffort).toBe("1h")
		expect(data.data.category).toBe("restart")
	})

	it("devrait exporter correctement le csv", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const res = await app.request("/api/anomalies/export/csv", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.text()
		expect(data).toContain(
			"ID,Titre,Description,Sévérité,Statut,Service,Composant,Métrique,Seuil,Valeur Actuelle,Impact Utilisateur,Détecté Le,Méthode Détection,Reporter,Actions Recommandées,Tags"
		)
	})

	it("devrait retourner les statistiques des anomalies", async () => {
		await testUtils.createTestAdmin({
			email: "admin1@example.com",
			password: "password",
			firstname: "Admin",
			lastname: "User",
		})

		await AnomalyService.logManualAnomaly({
			title: "Security anomaly 1",
			description: "Security anomaly 1",
			severity: "critical",
			service: "security-service",
			reporter: "test-user",
			tags: ["security"],
		})

		await AnomalyService.logManualAnomaly({
			title: "Security anomaly 2",
			description: "Security anomaly 2",
			severity: "warning",
			service: "security-service",
			reporter: "test-user",
			tags: ["security"],
		})

		await AnomalyService.logManualAnomaly({
			title: "Performance anomaly",
			description: "Performance anomaly",
			severity: "info",
			service: "performance-service",
			reporter: "test-user",
			tags: ["performance"],
		})

		const loginData = {
			email: "admin1@example.com",
			password: "password",
		}

		const loginRes = await app.request("/admin/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		})
		expect(loginRes.status).toBe(200)
		const loginDataRes = await loginRes.json()
		expect(loginDataRes.data).toHaveProperty("user")
		expect(loginDataRes.data).toHaveProperty("token")
		const token = loginDataRes.data.token

		const res = await app.request("/api/anomalies/stats", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data).toHaveProperty("data")
		expect(data.data.total).toBeGreaterThan(0)
		expect(data.data.byStatus).toBeDefined()
		expect(data.data.bySeverity).toBeDefined()
	})
})
