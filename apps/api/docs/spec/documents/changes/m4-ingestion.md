# Change — m4-ingestion · documents (API)

- **Status:** implemented + verified live (2026-10-25). Not committed (approval policy: ask).
- **Approval scope:** user standing instruction to run M4 autonomously; no commits made.
- **Authoritative record:** [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md)

## Delivered in M4
`POST /api/documents` (JSON `{title, content}`) with the full lifecycle: row inserted `processing`, chunked, embedded via Ollama (`nomic-embed-text`), upserted to Qdrant collection `documents`, then flipped to `ready` — or `error` + `error_reason` on pipeline failure. `list()` now maps `error_reason`; DTO gains optional `errorReason` (status union unchanged).

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/documents/ingest.ts` | create | chunk + embed + Qdrant upsert; plain global fetch, no SDK; PONYTAIL marker on the synchronous pipeline ceiling |
| `apps/api/src/documents/documents.service.ts` | modify | `upload()` lifecycle; `list()` maps `error_reason`; DTO optional field |
| `apps/api/src/documents/documents.controller.ts` | modify | POST route + body validation (400) |

## Verification evidence (live 2026-10-25)
- **API-M4-1 happy path:** `POST /api/documents` → HTTP 201, DTO `status:"ready"`, row `2a173d64-…`; Qdrant point `eb920f89-…` payload `{document_id,title,chunk_index:0,text}` matches spec; `GET /api/documents` reflects final status.
- **API-M4-2 error path:** Ollama down → row `b9177513-…` `status:"error"`, `errorReason:"Embedding request failed: fetch failed"` (labeled). Missing title / whitespace content → HTTP 400 `"title and content are required"`.
- **API-M4-3 Qdrant match:** point payload `document_id` equals uploaded row id; count/scroll/retrieve consistent after cleanup.
- **Enum sync:** status union unchanged across service, DTO, web `api.ts`, `StatusBadge`, DB `CHECK`; `npm run build -w doc-api` exit 0 confirms no type drift.
- **M4-SEED:** seed block removed; guarded migration + one-shot sample-row delete applied on boot.

### Fixes applied in this package (recorded, not silent)
1. Qdrant 1.20.0 collection-create is `PUT /collections/{name}` (not POST) — fixed in `ingest.ts`, verified live.
2. Qdrant 1.20.0 points-upsert is `PUT /collections/{name}/points` (not `POST …/upsert`) — fixed in `ingest.ts`, verified live.
3. Labeled network errors via `call(label,url,init)` helper so `errorReason` reads e.g. `"Embedding request failed: fetch failed"` instead of bare `"fetch failed"` — verified live.

Full shared evidence lives in the authoritative record.

## Next action
M4 implemented + verified. Commit/push on explicit approval; then candidate M5 (PDF/multipart or async queue per `ingest.ts` PONYTAIL marker).
