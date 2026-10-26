import { describe, it, expect, vi } from "vitest";

const KEYS = [
  "PORT",
  "DATABASE_PATH",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "EMBED_BASE_URL",
  "EMBED_MODEL",
  "LLM_API_KEY",
  "LLM_TEMPERATURE",
  "LLM_TOP_P",
  "LLM_MAX_TOKENS",
  "QDRANT_BASE_URL",
  "MAX_UPLOAD_MB",
] as const;

/** Re-import env.ts with a controlled process.env (config is read at import time). */
async function loadConfig(env: Record<string, string | undefined>) {
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  const mod = await import("./env");
  return mod.config;
}

describe("env config (API-M5-8 / API-M6-2)", () => {
  it("applies the documented defaults when nothing is set", async () => {
    const c = await loadConfig({});
    expect(c.llmBaseUrl).toBe("http://localhost:8888/v1");
    expect(c.llmModel).toBe("Qwen3.8-27B-Uncensored");
    // Embeddings default to the chat base URL when not pointed elsewhere.
    expect(c.embedBaseUrl).toBe("http://localhost:8888/v1");
    expect(c.embedModel).toBe("nomic-embed-text");
    expect(c.llmTemperature).toBe(0.2);
    // top_p is omitted from requests entirely when unset (API-M6-2).
    expect(c.llmTopP).toBeUndefined();
    expect(c.llmMaxTokens).toBe(1024);
    expect(c.qdrantBaseUrl).toBe("http://localhost:6333");
    expect(c.maxUploadMb).toBe(10);
  });

  it("honours overrides for every documented key", async () => {
    const c = await loadConfig({
      PORT: "4000",
      LLM_BASE_URL: "http://llm.local/v1",
      LLM_MODEL: "my-model",
      EMBED_BASE_URL: "http://embed.local/v1",
      EMBED_MODEL: "bge-small",
      LLM_TEMPERATURE: "0.5",
      LLM_MAX_TOKENS: "2048",
      QDRANT_BASE_URL: "http://qdrant.local:6333",
      MAX_UPLOAD_MB: "25",
    });
    expect(c.port).toBe(4000);
    expect(c.llmBaseUrl).toBe("http://llm.local/v1");
    expect(c.llmModel).toBe("my-model");
    expect(c.embedBaseUrl).toBe("http://embed.local/v1");
    expect(c.embedModel).toBe("bge-small");
    expect(c.llmTemperature).toBe(0.5);
    expect(c.llmMaxTokens).toBe(2048);
    expect(c.qdrantBaseUrl).toBe("http://qdrant.local:6333");
    expect(c.maxUploadMb).toBe(25);
  });

  it("sets llmTopP only when LLM_TOP_P is provided", async () => {
    const withTop = await loadConfig({ LLM_TOP_P: "0.9" });
    expect(withTop.llmTopP).toBe(0.9);
    const without = await loadConfig({});
    expect(without.llmTopP).toBeUndefined();
  });

  it("treats an empty LLM_API_KEY as unset (no Bearer header sent)", async () => {
    const empty = await loadConfig({ LLM_API_KEY: "" });
    expect(empty.llmApiKey).toBeUndefined();
    const set = await loadConfig({ LLM_API_KEY: "secret" });
    expect(set.llmApiKey).toBe("secret");
  });

  it("coerces numeric keys to numbers", async () => {
    const c = await loadConfig({ PORT: "7070", MAX_UPLOAD_MB: "5" });
    expect(c.port).toBe(7070);
    expect(c.maxUploadMb).toBe(5);
  });
});
