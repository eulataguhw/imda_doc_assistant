import { defineConfig } from "@playwright/test";

/**
 * M8 (TEST-M8-4) — Playwright E2E against the live local stack.
 *
 * Prereqs (already running as background jobs / containers in this workspace):
 *   - llama.cpp  :8888  (LLM, Qwen3.8-27B-Uncensored)
 *   - Ollama     :11434 (embeddings, nomic-embed-text)
 *   - Qdrant     :6333  (documents collection)
 *   - API        :3001  (apps/api dist/main.js)
 *   - web dev    :5173  (apps/web vite, proxies /api → :3001)
 *
 * `reuseExistingServer: true` reuses those running instances; if one is down it
 * boots the documented command instead. Tests run sequentially (workers: 1) so a
 * single llama.cpp instance is never hit by concurrent generations.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000, // LLM streaming can be slow on CPU
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        "cd apps/api && EMBED_BASE_URL=http://localhost:11434/v1 EMBED_MODEL=nomic-embed-text LLM_BASE_URL=http://localhost:8888/v1 LLM_MODEL=Qwen3.8-27B-Uncensored node --env-file=.env dist/main.js",
      url: "http://localhost:3001/api/documents",
      reuseExistingServer: true,
      timeout: 90_000,
    },
    {
      command: "cd apps/web && npx vite --port 5173 --strictPort",
      url: "http://localhost:5173/",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
