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
const columns = db.prepare("PRAGMA table_info(documents)").all() as unknown as Array<{ name: string }>;
if (!columns.some((c) => c.name === "error_reason")) {
  db.exec("ALTER TABLE documents ADD COLUMN error_reason TEXT");
}

// One-shot cleanup of the dev-only sample rows seeded by M1–M3 (idempotent).
db.prepare("DELETE FROM documents WHERE id LIKE 'doc-sample-%'").run();
