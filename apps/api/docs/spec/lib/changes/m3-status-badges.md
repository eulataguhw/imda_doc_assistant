# Change — m3-status-badges · lib (API)

- **Status:** complete + verified (2026-10-24).
- **Approval scope:** user standing instruction to implement M3 and pause at the boundary; no commits made.
- **Authoritative record:** [m3-status-badges](../../../../../../docs/spec/_cross-cutting/m3-status-badges.md)

## Delivered in M3
Idempotent seed of 3 fixed-id sample rows (one per status: `ready`/`processing`/`error`) guarded on `COUNT(*) = 0`, so the library UI can be verified against every badge state. Marked as dev-only via a PONYTAIL comment.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/lib/db.ts` | modify | idempotent seed block + status `CHECK` constraint; PONYTAIL: dev-only sample data; ceiling: replaced by M4 upload flow; upgrade: drop block when ingestion writes real rows; trigger: first real upload lands |

## Verification evidence
`GET /api/documents` returns the 3 seeded docs (curl exit 0); DB file `data/doc-assistant.db` created on boot.

Full shared evidence lives in the authoritative record.

## Next action
M4: remove the dev-only seed once real uploads arrive.
