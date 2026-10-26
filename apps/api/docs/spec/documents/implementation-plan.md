# Implementation Plan — api/documents

## Design delta (M1)

Standard NestJS trio. `DocumentsService.list()` returns `[]` (honest stub); controller exposes `GET /api/documents` with the DocumentDto shape that M2 will populate from SQLite.

## File operations (M1, all create)

| Path                                             | Op     | Reason              |
| ------------------------------------------------ | ------ | ------------------- |
| `apps/api/src/documents/documents.module.ts`     | create | module registration |
| `apps/api/src/documents/documents.controller.ts` | create | GET route + DTO     |
| `apps/api/src/documents/documents.service.ts`    | create | list() stub         |

## Requirement → step mapping

| Req (PRD) | Step                                        | Check                                         |
| --------- | ------------------------------------------- | --------------------------------------------- |
| API-DOC-1 | controller GET handler                      | live curl → 200 + `[]` (verified)             |
| API-DOC-2 | DTO typing vs DDL                           | source inspection against `sqlite_master` DDL |
| API-DOC-3 | M4: upload() + POST route + ingest pipeline | see M4 mapping below                          |

## Commands

    npm run build -w doc-api && curl http://localhost:3001/api/documents

## Deviations

None.

---

## M4 — ingestion/upload (spec gate 2026-10-25)

### Design delta

- `POST /api/documents` accepts JSON `{title, content}`; 400 on missing/non-string fields; 201 + final DTO. Transport chosen at the gate: no new deps (no multer/pdfjs in tree).
- `ingest.ts` (new, owned by this package): `chunkText()` paragraph-aware ~500-char chunks (PONYTAIL marker); `embedChunks()` via Ollama OpenAI-compatible `${config.llmBaseUrl}/embeddings` with `config.embedModel`; `upsertPoints()` ensures Qdrant collection `documents` exists and upserts UUID points, payload `{document_id, title, chunk_index, text}`. Plain global `fetch` (Node 24), no SDK.
- Service `upload()`: insert row `processing` (uuid) → ingest → update `ready`; on failure update `error` + `error_reason` (message). Synchronous in-request; PONYTAIL: ceiling ~50 KB text, upgrade to a job queue when uploads grow.
- DTO gains optional `errorReason?: string | null`; **status union unchanged** — enum-sync invariant preserved.

### File operations (M4)

| Path                                             | Op     | Reason                                                        |
| ------------------------------------------------ | ------ | ------------------------------------------------------------- |
| `apps/api/src/documents/ingest.ts`               | create | chunk + embed + upsert pipeline                               |
| `apps/api/src/documents/documents.service.ts`    | modify | `upload()` lifecycle; `list()` maps `error_reason`; DTO field |
| `apps/api/src/documents/documents.controller.ts` | modify | `POST /api/documents` + validation                            |

### Requirement → step mapping (M4)

| Req                  | Step                         | Check                                                                               |
| -------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| API-DOC-3 / API-M4-1 | service.upload() happy path  | curl POST → 201 `ready`; list reflects it                                           |
| API-M4-2             | failure path (services down) | curl POST → row `error` + non-empty reason; enum diff across 5 surfaces = identical |
| API-M4-3             | upsertPoints()               | Qdrant REST: points exist, payload.document_id matches                              |

### Commands

    npm run build -w doc-api
    cd apps/api && node dist/main.js &
    curl -s -X POST localhost:3001/api/documents -H 'content-type: application/json' \
      -d '{"title":"M4 sample","content":"…"}'
    curl -s localhost:6333/collections/documents/points?limit=5

## Deviations (M4)

Upload was PRD-labeled "M2"; delivered in M4 with JSON text transport — recorded in the authoritative [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md) scope decision.

---

## M5 — file upload + async indexing (spec gate 2026-10-25)

### Design delta

- **Upload/index split.** `POST /documents/upload` (multipart, `FileInterceptor("file")`) does: extension check → size check (`config.maxUploadMb`, 400 "File too large (max N MB)") → `extractText(buffer, filename)` (400 on unsupported type / no extractable text) → insert row `processing` → enqueue job → **201 + DTO immediately**. Indexing runs in a new in-process FIFO queue (`queue.ts`, sequential — PONYTAIL: worker pool when sustained backlog), per job: chunk → embed → Qdrant upsert → update row `ready`/`error` (+ reason). Progress map `{documentId: {stage, done, total}}` fed to `list()` as optional `progress`.
- **New files (this package):** `extract.ts` — `.pdf` via pdfjs-dist legacy Node build (per-page TextContent joined with newlines), `.docx` via mammoth raw text; typed errors. `queue.ts` — job runner + progress map + startup sweep (stale `processing` rows → `error`, "server restarted during indexing").
- **Existing files:** `documents.service.ts` (`upload()` fast path + job completion handler; `list()` maps `progress`; DTO gains optional `progress?`), `documents.controller.ts` (new multipart route; JSON POST retained), `ingest.ts` (`embedChunks()` reads `config.embedBaseUrl`, attaches `Authorization: Bearer` when `llmApiKey` set — request shape unchanged, already OpenAI-compatible).
- **Deps (api/\_root package.json):** `multer`, `@types/multer`, `pdfjs-dist`, `mammoth`, `@types/mammoth`. No web deps.

### File operations (M5)

| Path                                             | Op     | Reason                                         |
| ------------------------------------------------ | ------ | ---------------------------------------------- |
| `apps/api/src/documents/extract.ts`              | create | pdf/docx → text extraction                     |
| `apps/api/src/documents/queue.ts`                | create | FIFO job runner + progress map + startup sweep |
| `apps/api/src/documents/documents.service.ts`    | modify | fast enqueue; job completion; list progress    |
| `apps/api/src/documents/documents.controller.ts` | modify | multipart upload route + guards                |
| `apps/api/src/documents/ingest.ts`               | modify | embedBaseUrl + Bearer key                      |

### Requirement → step mapping (M5)

| Req                  | Step                                  | Check                                                                                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| API-M5-1 / API-DOC-4 | upload route + queue happy path (PDF) | curl multipart → 201 `processing` → poll → `ready`; Qdrant point by UUID                               |
| API-M5-2             | extract.ts docx branch                | same, DOCX fixture                                                                                     |
| API-M5-3 / -4        | controller guards + extract errors    | `.txt` → 400; no-text PDF → 400; **no row** (list count unchanged)                                     |
| API-M5-5             | `maxUploadMb` guard from env          | `MAX_UPLOAD_MB=1` → 2 MB file 400 "File too large (max 1 MB)"                                          |
| API-M5-6             | queue sequencing                      | 3 files at once → 3 rows, sequential jobs, all `ready`                                                 |
| API-M5-7             | ingest.ts embedBaseUrl + Bearer       | mock OpenAI-compatible server on :9999 receives `Authorization: Bearer test-key`; Ollama restore works |
| API-M5-8             | queue.ts startup sweep                | kill mid-indexing → restart → stale row `error`                                                        |

### Commands (M5)

    npm run build -w doc-api
    cd apps/api && node --env-file=.env dist/main.js &
    curl -s -F "file=@sample.pdf" localhost:3001/api/documents/upload
    curl -s localhost:3001/api/documents   # poll while processing

### Deviations (M5)

None recorded yet.
