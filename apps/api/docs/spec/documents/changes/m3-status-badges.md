# Change — m3-status-badges · documents (API)

- **Status:** complete + verified (2026-10-24).
- **Approval scope:** user standing instruction to implement M3 and pause at the boundary; no commits made.
- **Authoritative record:** [m3-status-badges](../../../../../../docs/spec/_cross-cutting/m3-status-badges.md)

## Delivered in M3

`list()` now reads the persisted `documents` table (typed row mapping to `DocumentDto`) instead of returning a hard-coded array; status values come from the seeded data.

## Files

| Path                                          | Op     | Reason                                                                                    |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `apps/api/src/documents/documents.service.ts` | modify | read real table; explicit `Record<string, SQLOutputValue>[]` → DTO mapping (fixes TS2352) |

## Verification evidence

`npm run build -w doc-api` exit 0; `GET /api/documents` returns the 3 seeded statuses (ready/processing/error).

Full shared evidence lives in the authoritative record.

## Next action

M4: ingestion/upload writes real rows; drop the dev-only seed.
