# PRD — api/documents (library API)

## Problem / baseline
The SPA Library view needs a source of truth for the document collection; M1 ships the contract, M2 ships real data.

## Outcome
`GET /api/documents` returns `DocumentDto[]` (`{id,title,status}`); M4 adds upload + status lifecycle `processing → ready | error`, persisted in SQLite, with an optional `errorReason` surfaced for failed ingests.

## Scope
- In (M1): controller/service/module, DTO shape, 200 with empty list.
- In (M4): `POST /api/documents` upload — JSON body `{title, content}` (text), ingestion pipeline in `ingest.ts` (chunk → Ollama embed → Qdrant upsert), list reads from the `documents` table incl. `error_reason`.
- Out of scope: binary PDF extraction + multipart (deferred; no parser/multipart dep installed — see [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md) scope decision), deletion semantics, chat retrieval wiring.

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-DOC-1 | `GET /api/documents` → 200 + JSON array. **Verified 2026-10-22: returned `[]`.** |
| API-DOC-2 | DTO shape `{id:string, title:string, status:"ready"\|"processing"\|"error"}` matches the SQLite CHECK constraint. Status union must stay identical across service, DTO, web `lib/api.ts`, `StatusBadge`, and the DB `CHECK` (M4 adds only an optional `errorReason`). |
| API-DOC-3 (delivered M4) | Upload → row inserted as `processing`, transitions to `ready` or `error`; list reflects final state. |

## Assumptions / questions
Upload transport decided at the M4 gate: JSON text body — zero new dependencies; multipart/PDF deferred (recorded, not silent).
