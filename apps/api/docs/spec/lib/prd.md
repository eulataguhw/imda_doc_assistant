# PRD — api/lib (config + persistence)

## Problem / baseline
The API needs typed environment configuration and the SQLite metadata store for documents.

## Outcome
`env.ts` exposes a typed config object; `db.ts` opens/creates the SQLite file and guarantees the `documents` table exists with a status CHECK constraint.

## Scope
- In: config (port, databasePath default `../../data/doc-assistant.db`, llmBaseUrl, llmModel, embedModel, **qdrantBaseUrl** — M4); DDL for `documents` + guarded `error_reason` migration (M4).
- In (M5): provider-agnostic LLM config — `embedBaseUrl` (`EMBED_BASE_URL`, defaults to `llmBaseUrl`), `llmApiKey` (`LLM_API_KEY`, optional Bearer), `maxUploadMb` (`MAX_UPLOAD_MB`, default 10). Full contract: master plan [ENV section](../../../../../../docs/plan.md); **any key change must land in env.ts + .env.example + docs/plan.md together** (API-M5-8).
- Out of scope: ingestion write logic (owned by the documents package), Qdrant point semantics (documents/ingest.ts).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-LIB-1 | First boot creates the db file at the configured path. |
| API-LIB-2 | `documents` table exists with id TEXT PK, title NOT NULL, status CHECK (ready/processing/error), created_at default now. **Verified 2026-10-22 against `sqlite_master`.** |
| API-LIB-3 | All env reads go through `env.ts` with safe defaults; no scattered `process.env`. |
| API-LIB-4 (M4) | Schema migration is guarded and idempotent: `error_reason TEXT` added via `PRAGMA table_info` check + `ALTER TABLE`, safe on fresh and existing DBs; dev-only seed block removed once real uploads land. |

## Assumptions / questions
`node:sqlite` (Node 24 built-in) is sufficient for M2 write volume; fallback driver better-sqlite3 13.0.3 if gaps appear.
