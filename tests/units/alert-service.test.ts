import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { AlertService } from "../../src/services/AlertService"

describe("AlertService", () => {
	let alertService: AlertService

	beforeEach(() => {
		vi.clearAllMocks()
		alertService = new AlertService()
	})

	afterEach(() => {
		// Cleanup des timers si nécessaire
		vi.clearAllMocks()
	})

	describe("getChannels", () => {
		it("devrait retourner les canaux configurés", () => {
			const channels = alertService.getChannels()
			expect(Array.isArray(channels)).toBe(true)
			expect(channels.length).toBeGreaterThan(0)
		})
	})

	describe("getActiveRules", () => {
		it("devrait retourner les règles actives", () => {
			const rules = alertService.getActiveRules()
			expect(Array.isArray(rules)).toBe(true)
		})
	})

	describe("getAlertHistory", () => {
		it("devrait retourner l'historique des alertes", () => {
			const history = alertService.getAlertHistory()
			expect(Array.isArray(history)).toBe(true)
		})

		it("devrait accepter un paramètre de limite", () => {
			const history = alertService.getAlertHistory(50)
			expect(Array.isArray(history)).toBe(true)
		})
	})

	describe("init", () => {
		it("devrait initialiser le service avec vérification périodique", () => {
			const setIntervalSpy = vi.spyOn(global, "setInterval").mockImplementation(() => 123 as any)
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

			alertService.init()

			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("AlertService initialisé"))

			setIntervalSpy.mockRestore()
			consoleSpy.mockRestore()
		})
	})
})
