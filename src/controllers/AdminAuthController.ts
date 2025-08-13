import { AdminAuthService, LoginRequestInfo } from "../services/AdminAuthService"
import { StatusCode } from "hono/utils/http-status"

export class AdminAuthController {
	private adminAuthService: AdminAuthService

	constructor(adminAuthService?: AdminAuthService) {
		this.adminAuthService = adminAuthService || new AdminAuthService()
	}

	/**
	 * Authentification admin
	 */
	async login(email: string, password: string, requestInfo: LoginRequestInfo) {
		const result = await this.adminAuthService.login(email, password, requestInfo)
		return {
			...result,
			statusCode: result.statusCode as StatusCode,
		}
	}

	/**
	 * Vérification du token admin
	 */
	async verifyToken(authHeader: string | undefined) {
		const result = await this.adminAuthService.verifyToken(authHeader)
		return {
			...result,
			statusCode: result.statusCode as StatusCode,
		}
	}

	/**
	 * Extraction des informations de requête pour le monitoring
	 */
	extractRequestInfo(c: any): LoginRequestInfo {
		return this.adminAuthService.extractRequestInfo(c)
	}
}
