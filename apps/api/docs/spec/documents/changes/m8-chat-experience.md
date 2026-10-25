# Change — documents (M8)

Part of [m8-chat-experience](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md). Owner: **Groq**.

## Delta
- `db.ts`: add `documents.origin` (`knowledge`|`chat`, default `knowledge`) + nullable `documents.content`; idempotent migration (existing `PRAGMA table_info` guard); backfill existing rows to `knowledge`.
- `documents.service.ts`: `list({origin?})` filter; `delete(id)` — remove row, and for knowledge call new `deletePoints(documentId)`.
- `ingest.ts`: add `deletePoints(documentId)` (Qdrant delete by payload `document_id`).
- `documents.controller.ts`: `DELETE /documents/:id` (204/404); `GET /documents?origin=`; `POST /chat/documents` multipart → `extractText` + store `origin='chat'`+`content`, no embed/queue, 201 `{id,title,pages}`.

## Files
| Path | Op | Requirement |
| --- | --- | --- |
| `src/lib/db.ts` | modify | API-M8-7,4 |
| `src/documents/ingest.ts` | add `deletePoints` | API-M8-8 |
| `src/documents/documents.service.ts` | modify | API-M8-4,7,8 |
| `src/documents/documents.controller.ts` | modify | API-M8-4,7,8 |

## Checks
- Vitest: origin filter; delete removes row + (knowledge) Qdrant points (mocked); chat-upload stores `content`+`origin=chat` with no Qdrant upsert; bad type/no text → 400 no row. Isolated DB.
- E2E (lead): delete a doc from its list; Knowledge vs Library split.

## Result (2026-10-26)
All green — API vitest 18/18 (origin filter, delete row+points, chat-upload no-embed); Playwright E2E knowledge.spec.ts + library.spec.ts 2/2 (list, upload-control presence/absence, delete). Full evidence: [authoritative record](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md#evidence-phase-2--actual-results-2026-10-26).
