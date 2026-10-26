# Change — m1-scaffold · _root

- **Status:** complete + verified (2026-10-22)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1

Bootable Nest entrypoint with global `/api` prefix (port 3001 default) and the two-module graph.

## Files

| Path                         | Op     | Reason                                       |
| ---------------------------- | ------ | -------------------------------------------- |
| `apps/api/src/main.ts`       | create | bootstrap: create → setGlobalPrefix → listen |
| `apps/api/src/app.module.ts` | create | module graph (Documents + Chat)              |

## Verification evidence

Build exit 0 (`dist/main.js` emitted); Nest boot log shows both routes mapped under `/api`; `GET /api/documents` → 200.

Full shared evidence lives in the authoritative record.

## Next action

None for M1 scope; M2 adds no bootstrap changes.
