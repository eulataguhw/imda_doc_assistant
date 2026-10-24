# Implementation Plan — api/documents

## Design delta (M1)
Standard NestJS trio. `DocumentsService.list()` returns `[]` (honest stub); controller exposes `GET /api/documents` with the DocumentDto shape that M2 will populate from SQLite.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/documents/documents.module.ts` | create | module registration |
| `apps/api/src/documents/documents.controller.ts` | create | GET route + DTO |
| `apps/api/src/documents/documents.service.ts` | create | list() stub |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| API-DOC-1 | controller GET handler | live curl → 200 + `[]` (verified) |
| API-DOC-2 | DTO typing vs DDL | source inspection against `sqlite_master` DDL |
| API-DOC-3 | M2 scope | — |

## Commands
    npm run build -w doc-api && curl http://localhost:3001/api/documents

## Deviations
None.
