// Configuration pour les tests
export const testConfig = {
	// Base de données de test
	database: {
		url: process.env.DATABASE_URL_TEST || "postgresql://test:test@localhost:5432/kifekoi_test",
	},

	// Configuration JWT
	jwt: {
		secret: process.env.JWT_SECRET || "test-secret-key-for-testing-only",
		expiresIn: "1h",
	},

	// Configuration MinIO
	minio: {
		endpoint: process.env.MINIO_ENDPOINT || "localhost",
		port: parseInt(process.env.MINIO_PORT || "9000"),
		accessKey: process.env.MINIO_ACCESS_KEY || "test-access-key",
		secretKey: process.env.MINIO_SECRET_KEY || "test-secret-key",
		bucket: process.env.MINIO_BUCKET || "images",
	},

	// Configuration des tests
	test: {
		timeout: parseInt(process.env.VITEST_TIMEOUT || "10000"),
		retry: parseInt(process.env.VITEST_RETRY || "2"),
	},

	// Configuration de l'API
	api: {
		baseUrl: "http://localhost:3001",
		version: "1.0.0",
	},
}

// Variables d'environnement requises pour les tests
export const requiredEnvVars = ["DATABASE_URL_TEST", "JWT_SECRET"]

// Vérification des variables d'environnement
export function validateTestEnvironment() {
	const missing = requiredEnvVars.filter((varName) => !process.env[varName])

	if (missing.length > 0) {
		console.warn("⚠️  Variables d'environnement manquantes pour les tests:")
		missing.forEach((varName) => {
			console.warn(`   - ${varName}`)
		})
		console.warn("Les valeurs par défaut seront utilisées.")
	}
}
