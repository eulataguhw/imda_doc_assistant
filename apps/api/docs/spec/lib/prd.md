# PRD — api/lib (config + persistence)

## Problem / baseline
The API needs typed environment configuration and the SQLite metadata store for documents.

## Outcome
`env.ts` exposes a typed config object; `db.ts` opens/creates the SQLite file and guarantees the `documents` table exists with a status CHECK constraint.

## Scope
- In: config (port, databasePath default `../../data/doc-assistant.db`, llmBaseUrl, llmModel, embedModel); DDL for `documents`.
- Out of scope: ingestion writes (M2), Qdrant client wiring (M2/M3).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-LIB-1 | First boot creates the db file at the configured path. |
| API-LIB-2 | `documents` table exists with id TEXT PK, title NOT NULL, status CHECK (ready/processing/error), created_at default now. **Verified 2026-10-22 against `sqlite_master`.** |
| API-LIB-3 | All env reads go through `env.ts` with safe defaults; no scattered `process.env`.

## Assumptions / questions
`node:sqlite` (Node 24 built-in) is sufficient for M2 write volume; fallback driver better-sqlite3 13.0.3 if gaps appear.
