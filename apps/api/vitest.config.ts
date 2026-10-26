import { defineConfig } from "vitest/config";

// M8 (TEST-M8-1/2): node environment, per-file isolated SQLite DB (see vitest.setup.ts),
// no jsdom/DOM needed for the API unit suite. Qdrant/LLM are mocked or inert in the tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      // Boilerplate DI wiring + bootstrap carry no logic worth asserting; the suite targets
      // controllers, services, and the extract/ingest/queue/env boundaries instead.
      exclude: ["**/*.test.ts", "src/main.ts", "**/*.module.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
