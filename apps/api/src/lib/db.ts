import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "./env";

const dir = path.dirname(config.databasePath);
fs.mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(config.databasePath);

db.exec(`CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready','processing','error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);`);

// M4 migration: add error_reason for databases created before it. Guarded + idempotent.
const columns = db.prepare("PRAGMA table_info(documents)").all() as unknown as Array<{
  name: string;
}>;
if (!columns.some((c) => c.name === "error_reason")) {
  db.exec("ALTER TABLE documents ADD COLUMN error_reason TEXT");
}

// M6 migration: LLM executive summary + real metadata (API-M6-5/6). Same guarded pattern.
for (const [name, def] of [
  ["summary", "TEXT"],
  ["pages", "INTEGER"],
  ["size_bytes", "INTEGER"],
] as const) {
  if (!columns.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE documents ADD COLUMN ${name} ${def}`);
  }
}

// M8 migration: document origin (knowledge|chat) + chat-doc content; guarded + idempotent.
if (!columns.some((c) => c.name === "origin")) {
  // Pre-M8 rows are all RAG docs → backfill to 'knowledge'.
  db.exec(`ALTER TABLE documents ADD COLUMN origin TEXT NOT NULL DEFAULT 'knowledge'`);
}
if (!columns.some((c) => c.name === "content")) {
  db.exec("ALTER TABLE documents ADD COLUMN content TEXT");
}

// M8: chat conversation history (sessions + messages). Created idempotently.
db.exec(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);`);
db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  citations TEXT,
  created_at REAL NOT NULL
);`);

// One-shot cleanup of the dev-only sample rows seeded by M1–M3 (idempotent).
db.prepare("DELETE FROM documents WHERE id LIKE 'doc-sample-%'").run();
