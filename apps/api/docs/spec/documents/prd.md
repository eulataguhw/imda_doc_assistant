# PRD — api/documents (library API)

## Problem / baseline
The SPA Library view needs a source of truth for the document collection; M1 ships the contract, M2 ships real data.

## Outcome
`GET /api/documents` returns `DocumentDto[]` (`{id,title,status}`); M4 adds upload + status lifecycle `processing → ready | error`, persisted in SQLite, with an optional `errorReason` surfaced for failed ingests.

## Scope
- In (M1): controller/service/module, DTO shape, 200 with empty list.
- In (M4): `POST /api/documents` upload — JSON body `{title, content}` (text), ingestion pipeline in `ingest.ts` (chunk → Ollama embed → Qdrant upsert), list reads from the `documents` table incl. `error_reason`.
- In (M5): `POST /api/documents/upload` multipart (`file`) — `.pdf`/`.docx`, env-capped size; sync extraction (`extract.ts`) + row insert as `processing` + **async FIFO indexing** (`queue.ts`: chunk → embed → Qdrant upsert) with per-doc progress surfaced via list (`progress?: {stage, done, total}`); 400s for unsupported type / no extractable text / oversize (no row created); startup sweep of stale `processing` rows. JSON endpoint retained as API-level capability.
- In (M8): **document origin + lifecycle** — `documents.origin` (`knowledge`|`chat`, default `knowledge`) and nullable `documents.content` (extracted text for chat docs, not embedded); `GET /api/documents?origin=` filter; `DELETE /api/documents/:id` (remove row; for knowledge also delete Qdrant points via new `deletePoints` in `ingest.ts`); `POST /api/chat/documents` multipart → extract + store `origin='chat'` + `content`, **no** embed/queue, 201 `{id,title,pages}`.
- Out of scope: OCR, concurrent embedding workers (PONYTAIL trigger in `queue.ts`). Document deletion is now in-scope (M8).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-DOC-1 | `GET /api/documents` → 200 + JSON array. **Verified 2026-10-22: returned `[]`.** |
| API-DOC-2 | DTO shape `{id:string, title:string, status:"ready"\|"processing"\|"error"}` matches the SQLite CHECK constraint. Status union must stay identical across service, DTO, web `lib/api.ts`, `StatusBadge`, and the DB `CHECK` (M4 adds only an optional `errorReason`). |
| API-DOC-3 (delivered M4) | Upload → row inserted as `processing`, transitions to `ready` or `error`; list reflects final state. |
| API-DOC-4 (M5) | File upload (`pdf`/`docx`) → immediate 201 + `processing` row; background indexing reaches `ready` with Qdrant points, or `error` + reason; per-doc progress observable via list while `processing`. Rejections (bad type, no text, oversize) are 400 with a message and create **no row**. See [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md) API-M5-1…8. |
| API-DOC-5 (M8) | `GET /api/documents?origin=chat` returns only chat docs; `?origin=knowledge` only knowledge; no param → all. See [m8-chat-experience](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md) API-M8-7. |
| API-DOC-6 (M8) | `DELETE /api/documents/:id` removes the row and (for knowledge) its Qdrant points; 204 then absent from list; 404 if unknown. See m8 API-M8-8. |
| API-DOC-7 (M8) | `POST /api/chat/documents` extracts, stores `origin='chat'` + `content`, **no** Qdrant points; 201 `{id,title,pages}`; bad type/no text → 400 with no row. See m8 API-M8-4. |

## Assumptions / questions
Upload transport decided at the M4 gate: JSON text body — zero new dependencies; multipart/PDF deferred (recorded, not silent). M5 supersedes the deferral: multipart + extraction added with `multer`/`pdfjs-dist`/`mammoth`; title defaults to filename-minus-extension (optional override kept).
