# Change Record — m4-ingestion (authoritative)

- **Goal:** M4 — ingestion/upload flow: `POST /api/documents` persists a real row (`processing` → `ready`|`error`), embeds chunks via Ollama and stores vectors in Qdrant; web Library gains a working upload control and views reflect the final state.
- **Status:** implemented + verified live (2026-10-25). All acceptance criteria exercised against running services; evidence below. Not committed (approval policy: ask).
- **Approval scope:** user standing instruction — "Run autonomously and complete M4 by yourself." No commits/pushes made unless explicitly approved later.

## Scope decision (recorded, not silent)

M4 accepts **text content** via JSON body `{title, content}`. Binary PDF extraction is deferred: no PDF parser or multipart dependency is installed (`apps/api` deps are NestJS core only), and `nomic-embed-text` is a text model. UI copy that asserts PDF-specific failure is adjusted to the real reason. This satisfies API-DOC-3's state-machine requirement (processing → ready|error) without adding dependencies; PDF ingest is a candidate M5.

## Before → after

M3 left `GET /api/documents` reading 3 dev-only seeded rows, no write path, and a Library "Upload" icon with no control. After M4: real uploads persist rows, the embedding pipeline (Ollama → Qdrant collection `documents`) runs per upload, status transitions are observable via the list endpoint, error rows carry a machine-readable reason shown in the UI, and the dev-only seed block is removed (PONYTAIL trigger satisfied).

## Deliverables

| Path                                             | Op     | Reason                                                                                                |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/env.ts`                        | modify | add `qdrantBaseUrl` (env `QDRANT_BASE_URL`, default `http://localhost:6333`)                          |
| `apps/api/src/lib/db.ts`                         | modify | drop dev-only seed block; guarded migration adding `error_reason TEXT`; keep status `CHECK`           |
| `apps/api/src/documents/ingest.ts`               | create | chunk + Ollama embed + Qdrant upsert (plain global `fetch`, no SDK)                                   |
| `apps/api/src/documents/documents.service.ts`    | modify | `upload()` orchestrates row lifecycle; `list()` maps `error_reason`; DTO gains optional `errorReason` |
| `apps/api/src/documents/documents.controller.ts` | modify | `POST /api/documents` with body validation (400 on bad shape)                                         |
| `apps/web/src/lib/api.ts`                        | modify | `uploadDocument()`; `Document` gains optional `errorReason` (status union unchanged)                  |
| `apps/web/src/pages/LibraryPage.tsx`             | modify | working upload form (title + content) → POST → list refresh                                           |
| `apps/web/src/pages/DocumentDetailPage.tsx`      | modify | show real `errorReason` for error docs; drop PDF-asserting copy                                       |
| `apps/web/src/lib/docMeta.ts`                    | modify | error-case excerpt text updated to match the real (text-body) ingestion scope                         |

## Acceptance criteria

| ID       | Criterion                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-M4-1 | `POST /api/documents {title, content}` → 201 + final DTO; row transitions `processing` → `ready` with Ollama+Qdrant reachable; list reflects final status.                |
| API-M4-2 | With embedding/vector store unreachable, row ends `error` with non-empty `error_reason`; status union identical in service, DTO, web `api.ts`, `StatusBadge`, DB `CHECK`. |
| API-M4-3 | Qdrant collection `documents` holds points whose payload `document_id` matches the uploaded doc.                                                                          |
| WEB-M4-1 | Library upload control persists a document; list updates with the final-status badge.                                                                                     |
| WEB-M4-2 | Detail page displays the real error reason for `error` docs.                                                                                                              |
| M4-SEED  | Dev-only seed block removed from `db.ts`; first real rows replace samples.                                                                                                |

## Verification plan

1. Start `qdrant/qdrant` + `ollama/ollama` (local docker images present) and ensure `nomic-embed-text` is available; if the model pull fails, record it and still verify API-M4-2 via the unreachable path.
2. `npm run build -w doc-api` / `-w doc-web` → exit 0.
3. Boot API (cwd `apps/api`, `node dist/main.js`); curl POST happy path + failure path; inspect row states, Qdrant points, and enum sync across the 5 surfaces.
4. Web: dev server :5173 proxy check of the upload round-trip; emitted-bundle wiring check; browser pass if a browser tool is available, else record the boundary honestly (as M3 did).

## Verification evidence (live, 2026-10-25)

Environment: Docker containers `doc-qdrant` (Qdrant 1.20.0), `doc-ollama` (`nomic-embed-text:latest`, 768-dim, OpenAI-compatible endpoint at `:11434/v1/embeddings`). API built with `npm run build -w doc-api` (tsc exit 0), run as `node dist/main.js` (cwd `apps/api`) on `:3001`. Web built with `npm run build -w doc-web` (tsc + vite, exit 0); dev server `npm run dev -w doc-web -- --port 5173 --strictPort`.

- **API-M4-1 (happy path):** `POST /api/documents` `{title:"M4 verification doc", content:<3 paragraphs>}` → **HTTP 201**, final DTO `{"status":"ready"}`. Row `2a173d64-090f-496d-b3b6-c1b5177fe740` in SQLite; Qdrant collection `documents` holds point `eb920f89-596a-4b60-bb9d-e18e9ea262c3` with payload `{document_id:"2a173d64-…", title:"M4 verification doc", chunk_index:0, text:<full text>}` — 3 short paragraphs correctly packed into one ~500-target chunk → one point. `GET /api/documents` reflects final status.
- **API-M4-2 (error path):** with `doc-ollama` stopped, same POST → **HTTP 201**, row `b9177513-76d6-4452-8820-e91f7880e031` status `error`, `errorReason:"Embedding request failed: fetch failed"` (labeled, not bare). Missing title or whitespace-only content → **HTTP 400** `"title and content are required"`.
- **API-M4-3 (Qdrant payload match):** point payload `document_id` equals the uploaded row id (above); count/scroll/retrieve all consistent after cleanup.
- **WEB-M4-1 (upload round-trip via Vite proxy :5173):** SPA `GET /` → 200; `GET /api/documents` via proxy returns the list including `errorReason`; `POST /api/documents` via proxy → **HTTP 201** row `51c5869a-526c-4d54-abb7-4da07e661a32` status `ready`, Qdrant point `5c729205-5cc6-4fe3-9427-ea45a5751278` created. **Boundary:** no browser tooling in this environment — UI rendering/interaction (form submit, badge update) verified only by the proxy round-trip + build, not a live DOM pass (same boundary as M3).
- **WEB-M4-2 (error-reason display):** `DocumentDetailPage.tsx` renders `doc.errorReason` with fallback; `docMeta.ts` error excerpt updated. Verified in source + build; DOM rendering not browser-checked (boundary above).
- **M4-SEED:** dev-only seed block removed from `db.ts`; guarded idempotent migration (`PRAGMA table_info` → `ALTER TABLE ADD COLUMN error_reason TEXT`) applied on boot; one-shot `DELETE … LIKE 'doc-sample-%'` cleared legacy sample rows. Post-boot `GET /api/documents` returned empty list before first real upload.
- **Enum sync (API-M4-2 invariant):** status union `"ready"|"processing"|"error"` unchanged across `documents.service.ts`, web `api.ts`, `StatusBadge.tsx`, and DB `CHECK`; both apps' builds pass, confirming no type drift.

### Fixes applied during verification (recorded, not silent)

1. **Qdrant collection-create 404:** Qdrant 1.20.0 removed `POST /collections` and `POST /collections/{name}`; create is now `PUT /collections/{name}` with body `{vectors:{size,distance:"Cosine"}}`. Fixed in `ingest.ts`; verified live (collection `documents` created, size 768 Cosine).
2. **Qdrant points-upsert 404:** `POST …/points/upsert` gone; upsert is now `PUT /collections/{name}/points` with UUID ids. Fixed in `ingest.ts`; verified live (happy path reached `ready`).
3. **Terse network errorReason:** bare `fetch` failures surfaced as just `"fetch failed"`. Added a labeled `call(label,url,init)` helper wrapping all 4 fetch sites so reasons read e.g. `"Embedding request failed: fetch failed"`. Verified live on the error path.

### Test-state cleanup

- Deleted all intermediate test rows from SQLite (5 rows) and the orphan Qdrant point `e389ea9f-…` (whose row was removed), so Qdrant↔SQLite are consistent: 2 `ready` docs each with exactly one point, 1 `error` doc with none.

## Non-goals / follow-ups

- Binary/PDF text extraction and multipart upload (candidate M5).
- Chat RAG retrieval against the new collection (M3 stub already fixes the SSE contract).
- Async job queue for large documents (see PONYTAIL marker in `ingest.ts`).

## Limitations

- No browser tooling in this environment: WEB-M4-1/2 verified via Vite-proxy round-trip + clean builds, not a live DOM pass (same boundary as M3).
- Hindsight memory backend returned 401 (not authenticated) when attempting `capture_initiative`; recorded as an environment limitation, no retry.

## Next action

M4 implemented and verified. Remaining: commit/push only on explicit user approval (approval policy: ask); then candidate M5 (PDF/multipart ingest or async queue per the PONYTAIL marker in `ingest.ts`).
