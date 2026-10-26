# Change — m1-scaffold · documents

- **Status:** complete + verified (2026-10-22)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1

`GET /api/documents` contract endpoint (empty-list stub) with the DocumentDto shape.

## Files

| Path                                             | Op     | Reason              |
| ------------------------------------------------ | ------ | ------------------- |
| `apps/api/src/documents/documents.module.ts`     | create | module registration |
| `apps/api/src/documents/documents.controller.ts` | create | GET route + DTO     |
| `apps/api/src/documents/documents.service.ts`    | create | list() stub         |

## Verification evidence

Live `curl` 2026-10-22: `GET /api/documents` → `[]`.

Full shared evidence lives in the authoritative record.

## Next action

M2: upload endpoint + status lifecycle; service reads from the `documents` table.
