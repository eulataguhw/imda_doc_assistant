import { defineConfig } from "vitest/config";

// M8 (TEST-M8-1/2): node environment, per-file isolated SQLite DB (see vitest.setup.ts),
// no jsdom/DOM needed for the API unit suite. Qdrant/LLM are mocked or inert in the tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
