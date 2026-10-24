# Development Plan — api/lib

- **Deliverable:** typed config module + idempotent SQLite schema bootstrap.
- **Order:** env.ts (pure, no I/O) → db.ts (mkdir + CREATE TABLE IF NOT EXISTS). M1 delivered both.
- **Validation:** build passes; direct `sqlite_master` query returns the DDL (quoted in change record).
- **Rollout/recovery:** schema is additive-only in M1–M3; recovery = delete file + re-bootstrap (demo grade).
- **Status:** M1 complete + verified 2026-10-22. M2: ingestion writes land here.
