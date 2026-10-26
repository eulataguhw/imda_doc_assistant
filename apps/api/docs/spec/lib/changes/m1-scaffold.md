# Change — m1-scaffold · lib

- **Status:** complete + verified (2026-10-22)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1

Typed env config + SQLite `documents` table bootstrap.

## Files

| Path                      | Op     | Reason                      |
| ------------------------- | ------ | --------------------------- |
| `apps/api/src/lib/env.ts` | create | typed config with defaults  |
| `apps/api/src/lib/db.ts`  | create | node:sqlite bootstrap + DDL |

## Verification evidence

DDL verified 2026-10-22 via direct `sqlite_master` query:

    CREATE TABLE documents (

id TEXT PRIMARY KEY,
title TEXT NOT NULL,
status TEXT NOT NULL CHECK (status IN ('ready','processing','error')),
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)

Full shared evidence lives in the authoritative record.

## Next action

M2: ingestion writes (insert processing → update ready/error) land in this package.
