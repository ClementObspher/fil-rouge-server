import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		// Exécution séquentielle pour éviter les deadlocks de base de données
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		// Timeout plus long pour les tests de base de données
		testTimeout: 30000,
		// Exécution séquentielle
		sequence: {
			concurrent: false,
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"coverage/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/setup.ts",
				"**/config.ts",
				"prisma/",
				"scripts/",
				"docs/",
				"tests/",
				"src/docs/",
				"src/public/",
				"src/index.ts",
				"src/routes/",
				"src/enums/",
				"src/middleware/monitoring.ts",
			],
			thresholds: {
				branches: 50,
				functions: 70,
				lines: 70,
				statements: 70,
			},
		},
	},
})
