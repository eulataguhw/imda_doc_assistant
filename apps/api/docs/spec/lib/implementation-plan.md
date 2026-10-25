# Implementation Plan — api/lib

## Design delta (M1)
`env.ts`: reads PORT/DATABASE_PATH/LLM_BASE_URL/LLM_MODEL/EMBED_MODEL once, exports typed config with defaults. `db.ts`: `DatabaseSync` from `node:sqlite`, creates parent dir, runs `CREATE TABLE IF NOT EXISTS documents (...)`.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/lib/env.ts` | create | single source of env config |
| `apps/api/src/lib/db.ts` | create | SQLite bootstrap + documents DDL |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| API-LIB-1 | mkdir + open at configured path | file exists after boot |
| API-LIB-2 | CREATE TABLE statement | `sqlite_master` query (see change record) |
| API-LIB-3 | env.ts single accessor | source inspection |

## Commands
    npm run build -w doc-api
    # DDL check: require dist/lib/db.js with a temp DATABASE_PATH, then query sqlite_master

## Deviations
None — `node:sqlite` choice is deliberate (see PRD assumptions).

---

## M4 — config + migration (spec gate 2026-10-25)

### Design delta
- `env.ts`: add `qdrantBaseUrl` — env `QDRANT_BASE_URL`, default `http://localhost:6333`. Embedding endpoint reuses the existing `llmBaseUrl` (Ollama OpenAI-compatible `/embeddings`); no new LLM env var.
- `db.ts`: remove the dev-only seed block (PONYTAIL trigger satisfied — real uploads now exist). Add guarded migration: read `PRAGMA table_info(documents)`; if `error_reason` absent, run `ALTER TABLE documents ADD COLUMN error_reason TEXT`. Idempotent on fresh and existing DBs.

### File operations (M4)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/lib/env.ts` | modify | `qdrantBaseUrl` config field |
| `apps/api/src/lib/db.ts` | modify | drop seed block; guarded `error_reason` migration |

### Requirement → step mapping (M4)
| Req | Step | Check |
| --- | --- | --- |
| API-LIB-4 | PRAGMA check + ALTER in db.ts | boot on existing DB, then fresh DB — both succeed; column present exactly once |
| M4-SEED | remove seed block | list endpoint shows only real rows after first upload |

## Deviations (M4)
None.

---

## M5 — provider-agnostic LLM config + upload cap (spec gate 2026-10-25)

### Design delta
`env.ts` gains three fields, all with safe defaults and no new dependency:
- `embedBaseUrl` — env `EMBED_BASE_URL`, **defaults to `llmBaseUrl`** when unset (embeddings may run on a different box/provider than chat; Ollama ↔ llama.cpp ↔ cloud is config-only).
- `llmApiKey` — env `LLM_API_KEY`, optional; callers attach `Authorization: Bearer …` only when set.
- `maxUploadMb` — env `MAX_UPLOAD_MB`, default `10`.

Contract rule (API-M5-8): every key must exist with matching meaning/default in `env.ts` + `.env.example` + [master plan ENV section](../../../../../../docs/plan.md), changed together.

### File operations (M5)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/lib/env.ts` | modify | three config fields above |

### Requirement → step mapping (M5)
| Req | Step | Check |
| --- | --- | --- |
| API-M5-8 | env.ts + .env.example + docs/plan.md sync | diff of the three surfaces; `MAX_UPLOAD_MB=1` rejected a 2 MB file via `.env` pickup (`--env-file`) |

## Deviations (M5)
None.
