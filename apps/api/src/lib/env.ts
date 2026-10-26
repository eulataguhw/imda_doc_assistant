interface AppConfig {
  port: number;
  databasePath: string;
  llmBaseUrl: string;
  llmModel: string;
  embedBaseUrl: string;
  embedModel: string;
  llmApiKey?: string;
  // M6 sampling params (API-M6-2): temperature + max_tokens always sent; top_p only when set.
  llmTemperature: number;
  llmTopP?: number;
  llmMaxTokens: number;
  qdrantBaseUrl: string;
  maxUploadMb: number;
}

// const llmBaseUrl = process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";
const llmBaseUrl = process.env.LLM_BASE_URL ?? "http://localhost:8888/v1";

// Keys must stay in sync with .env.example and the ENV contract table in docs/plan.md (API-M5-8).
export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? "../../data/doc-assistant.db",
  llmBaseUrl,
  // llmModel: process.env.LLM_MODEL ?? "qwen2.5:7b-instruct-q4_K_M",
  llmModel: process.env.LLM_MODEL ?? "Qwen3.8-27B-Uncensored",
  // Embeddings may run on a different box/provider than chat; defaults to LLM_BASE_URL when unset.
  embedBaseUrl: process.env.EMBED_BASE_URL ?? llmBaseUrl,
  embedModel: process.env.EMBED_MODEL ?? "nomic-embed-text",
  // Optional; when set, Authorization: Bearer <key> is sent on LLM calls (Ollama/llama.cpp ignore it).
  llmApiKey: process.env.LLM_API_KEY || undefined,
  // M6 sampling params. top_p omitted from requests entirely when unset (API-M6-2).
  llmTemperature: Number(process.env.LLM_TEMPERATURE ?? 0.2),
  llmTopP: process.env.LLM_TOP_P ? Number(process.env.LLM_TOP_P) : undefined,
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS ?? 1024),
  qdrantBaseUrl: process.env.QDRANT_BASE_URL ?? "http://localhost:6333",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
};
