interface AppConfig {
  port: number;
  databasePath: string;
  llmBaseUrl: string;
  llmModel: string;
  embedModel: string;
  qdrantBaseUrl: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? "../../data/doc-assistant.db",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
  llmModel: process.env.LLM_MODEL ?? "qwen2.5:7b-instruct-q4_K_M",
  embedModel: process.env.EMBED_MODEL ?? "nomic-embed-text",
  qdrantBaseUrl: process.env.QDRANT_BASE_URL ?? "http://localhost:6333",
};
