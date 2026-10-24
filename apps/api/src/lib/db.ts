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

// Seed three sample documents (one per status) on first run so the library UI
// can be verified against all badge states. Idempotent: skipped once any row exists.
// PONYTAIL: dev-only sample data, not real ingested docs; ceiling: replaced by M4 upload flow;
// upgrade: drop this block when ingestion writes real rows; trigger: first real upload lands.
const { n } = db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
if (n === 0) {
  const insert = db.prepare("INSERT INTO documents (id, title, status) VALUES (?, ?, ?)");
  insert.run("doc-sample-ready", "Quarterly onboarding guide (sample)", "ready");
  insert.run("doc-sample-processing", "Vendor contract — embedding (sample)", "processing");
  insert.run("doc-sample-error", "Legacy PDF — parse failed (sample)", "error");
}
