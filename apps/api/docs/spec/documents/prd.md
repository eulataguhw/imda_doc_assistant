# PRD — api/documents (library API)

## Problem / baseline
The SPA Library view needs a source of truth for the document collection; M1 ships the contract, M2 ships real data.

## Outcome
`GET /api/documents` returns `DocumentDto[]` (`{id,title,status}`); M2 adds upload + status lifecycle `processing → ready | error`, persisted in SQLite.

## Scope
- In (M1): controller/service/module, DTO shape, 200 with empty list.
- In (M2): `POST /api/documents` upload (PDF), ingestion hook into `lib`, list reads from the `documents` table.
- Out of scope: chunk/embed logic (M2 pipeline), deletion semantics (M4).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-DOC-1 | `GET /api/documents` → 200 + JSON array. **Verified 2026-10-22: returned `[]`.** |
| API-DOC-2 | DTO shape `{id:string, title:string, status:"ready"\|"processing"\|"error"}` matches the SQLite CHECK constraint. |
| API-DOC-3 (M2) | Upload → row inserted as `processing`, transitions to `ready` or `error`; list reflects final state. |

## Assumptions / questions
None blocking; M2 upload transport (multipart vs raw body) decided during M2 spec.
