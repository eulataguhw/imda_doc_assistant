# Change — m4-ingestion · lib (config + persistence)

- **Status:** implemented + verified live (2026-10-25). Not committed (approval policy: ask).
- **Approval scope:** user standing instruction to run M4 autonomously; no commits made.
- **Authoritative record:** [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md)

## Delivered in M4

`env.ts` exposes `qdrantBaseUrl` (default `http://localhost:6333`). `db.ts` drops the dev-only seed block and applies a guarded, idempotent migration adding `error_reason TEXT` to `documents`. All env reads still flow through `env.ts` (API-LIB-3 preserved).

## Files

| Path                      | Op     | Reason                                               |
| ------------------------- | ------ | ---------------------------------------------------- |
| `apps/api/src/lib/env.ts` | modify | `qdrantBaseUrl` config field                         |
| `apps/api/src/lib/db.ts`  | modify | seed block removed; guarded `error_reason` migration |

## Verification evidence (live 2026-10-25)

- **qdrantBaseUrl:** Qdrant REST calls in `ingest.ts` resolve against `http://localhost:6333` (default), proven by live collection-create + upsert succeeding.
- **Migration idempotency:** API booted repeatedly against the existing DB; `PRAGMA table_info(documents)` → columns `id, title, status, created_at, error_reason`, with `error_reason` present **exactly once** (guarded `PRAGMA table_info` check prevents duplicate `ALTER TABLE`).
- **Seed removal:** dev-only seed block gone from `db.ts`; one-shot `DELETE … LIKE 'doc-sample-%'` cleared legacy sample rows on boot.

## Next action

M4 implemented + verified. Commit/push on explicit approval; then candidate M5 per the cross-cutting record.
