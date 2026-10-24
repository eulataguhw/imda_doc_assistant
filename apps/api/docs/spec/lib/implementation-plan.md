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
