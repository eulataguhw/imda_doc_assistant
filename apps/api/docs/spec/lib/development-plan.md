# Development Plan — api/lib

- **Deliverable:** typed config module + idempotent SQLite schema bootstrap.
- **Order:** env.ts (pure, no I/O) → db.ts (mkdir + CREATE TABLE IF NOT EXISTS). M1 delivered both.
- **Validation:** build passes; direct `sqlite_master` query returns the DDL (quoted in change record).
- **Rollout/recovery:** schema is additive-only in M1–M4; the M4 `error_reason` migration is guarded (`PRAGMA table_info` check + `ALTER TABLE`) so it is a no-op when already applied; recovery = delete file + re-bootstrap (demo grade).
- **Status:** M1 complete + verified 2026-10-22. M4: config gains `qdrantBaseUrl`; db.ts drops the dev-only seed and adds the guarded migration. M5 (spec gate 2026-10-25): config gains `embedBaseUrl`/`llmApiKey`/`maxUploadMb` — provider-agnostic contract per master plan [ENV section](../../../../../../docs/plan.md); no schema change. Ingestion writes themselves stay in the documents package.
