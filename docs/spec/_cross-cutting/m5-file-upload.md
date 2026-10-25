# Change Record — m5-file-upload (authoritative)

- **Goal:** M5 (root batch; completes v3-M2 ingestion & library) — Library upload surface becomes a **drag-drop / click-to-browse dropzone** accepting `.pdf`/`.docx`, size-capped, **multiple files in one flow**; rejected files are never added and produce an error toast naming each file and why; a loader shows while uploads are in flight; after upload, Library shows which docs are **indexing with progress** (stage + chunks done/total) until `ready`/`error`. Split upload (sync: validate + extract) from indexing (async queue). `.env` becomes the documented provider-agnostic config surface for LLM + embedding (Ollama / llama.cpp / cloud) and upload cap. The v3 master plan is installed at `docs/plan.md` as canonical.
- **Status:** **implemented & verified 2026-10-25** (live acceptance pass, evidence below). Commit/push pending explicit approval.
- **Approval scope:** user standing instruction — "Run autonomously and complete milestones." Plan approved via plan-mode exit 2026-10-25 (incl. provider-agnostic `.env` requirement: "if i wanna connect to llamacpp server and not ollama, how? thus the plan for env file should account for changes done to it as well"). No commits/pushes made unless explicitly approved later.

## Scope decision (recorded, not silent)
- **Upload vs indexing split:** upload = multipart POST → extension/size validation + **synchronous text extraction** (fast) → insert row `processing` → enqueue job → 201 immediately. Indexing = in-process **FIFO queue, sequential jobs** runs chunk → embed → Qdrant upsert, then flips row `ready`/`error`. Sequential by design: local Ollama embedding is the bottleneck (PONYTAIL marker in `queue.ts`: worker pool when concurrent load demands).
- **Text panel removed from UI.** JSON `POST /api/documents` stays at API level (committed/tested; curl + test hook) — only the panel goes.
- **Provider-agnostic LLM:** verified against code — `embedChunks()` already speaks standard OpenAI-compatible (`POST {base}/embeddings`, `{model, input}`, `data[].embedding`). Missing pieces added this milestone: optional `LLM_API_KEY` (Bearer header), independent `EMBED_BASE_URL` (defaults to `LLM_BASE_URL`), `MAX_UPLOAD_MB`. No provider hardcoded anywhere.
- **No browser tooling in this environment** — DOM behavior verified by code + built-bundle inspection + Vite-proxy round-trips (same boundary as M3/M4).

## Before → after
M4 leaves a synchronous JSON text-upload endpoint, a Library text form (title + content), and no visible "indexing" state (row is `ready`/`error` by response time). After M5: the upload surface is a dropzone (`accept=".pdf,.docx"`, multiple); unacceptable files are rejected pre- or server-side with per-file toasts and **no row created**; acceptable files return 201 immediately as `processing`; indexing runs in a background queue with per-doc progress surfaced via the list endpoint; Library shows live "Embedding N/M chunks" lines while polling; `.env` (real file + refreshed `.env.example`) is the single documented config surface for providers and limits; `docs/plan.md` is the canonical master plan.

## Deliverables
| Path | Op | Owning package | Reason |
| --- | --- | --- | --- |
| `docs/plan.md` | create | root docs | v3 master plan verbatim + status table + numbering map + ENV contract (canonical main plan) |
| `docs/development-plan.md` | modify | root docs | header rule: master plan is canonical; M5 row with evidence |
| `docs/spec/README.md` | modify | spec index | current change id → m5-file-upload; register new files in ownership maps |
| `apps/api/package.json` | modify | api/_root | deps: multer, @types/multer, pdfjs-dist, mammoth, @types/mammoth; `start` script → `node --env-file=.env dist/main.js` (Node 24 built-in loader, no dotenv) |
| `apps/api/.env` | create | api/_root | real local config values + commented llama.cpp/cloud examples (gitignored already) |
| `apps/api/.env.example` | modify | api/_root | full ENV contract incl. `EMBED_BASE_URL`, `LLM_API_KEY`, `MAX_UPLOAD_MB` |
| `apps/api/src/lib/env.ts` | modify | api/lib | add `embedBaseUrl` (fallback `llmBaseUrl`), `llmApiKey`, `maxUploadMb` (default 10) |
| `apps/api/src/documents/extract.ts` | create | api/documents | `extractText(buffer, filename)`: `.pdf` → pdfjs-dist per-page TextContent joined; `.docx` → mammoth raw text; unsupported type / no extractable text → typed errors (400) |
| `apps/api/src/documents/queue.ts` | create | api/documents | FIFO sequential job runner + progress map `{stage, done, total}` + startup sweep of stale `processing` rows → `error` ("server restarted during indexing") |
| `apps/api/src/documents/documents.service.ts` | modify | api/documents | `upload()`: insert `processing` → enqueue (chunk→embed→upsert) → return immediately; job completion updates DB + progress; `list()` maps optional `progress`; DTO gains `progress?` |
| `apps/api/src/documents/documents.controller.ts` | modify | api/documents | add `POST /documents/upload`: FileInterceptor("file"), env-driven size limit (400 over-limit "File too large (max N MB)"), server-side type check, extract (400 no-text), title = provided or filename-minus-extension; existing JSON POST kept |
| `apps/api/src/documents/ingest.ts` | modify | api/documents | `embedChunks()` uses `config.embedBaseUrl`; attaches `Authorization: Bearer` when `llmApiKey` set. Request/response shape unchanged (already OpenAI-compatible) |
| `apps/web/package.json` | — (no-op) | web/_root | **no new web deps** — toast infra is zustand (installed) + one component |
| `apps/web/src/components/Toaster.tsx` | create | web/pages | zustand toast store (push/dismiss, ~5s auto-timeout) + `<Toaster/>` viewport; success/error variants; aria-live polite |
| `apps/web/src/App.tsx` | modify | web/_root | mount `<Toaster/>` once above routes |
| `apps/web/src/lib/api.ts` | modify | web/_root | `uploadDocumentFile(file, title?)` → FormData POST `/api/documents/upload` with shared error-message parsing; `Document` gains optional `progress`; keep JSON `uploadDocument()` |
| `apps/web/src/pages/LibraryPage.tsx` | modify | web/pages | **remove** text UploadPanel; dropzone (drag-over highlight, drop handler, click → hidden `<input type="file" multiple accept=".pdf,.docx">`); per-file client validation (type/size) with one toast per rejected file ("name removed — reason"); loader "Uploading N of M…" while POSTs in flight (bounded concurrency ~2); processing cards show live progress line; poll list every 2s while any row `processing` |
| `apps/web/src/pages/DocumentDetailPage.tsx` / `src/lib/docMeta.ts` | modify (copy) | web/pages | align copy that still references the text flow (if any at implementation time) |

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-M5-1 | `POST /api/documents/upload` with a PDF → 201, row `processing`, then transitions to `ready`; list shows progress mid-flight; Qdrant gains point(s) for the doc (by real UUID). |
| API-M5-2 | Same happy path with a DOCX. |
| API-M5-3 | Unsupported type (e.g. `.txt`) → 400 with message, **no row created**. |
| API-M5-4 | PDF/DOCX with no extractable text → 400 "No extractable text found…", no row. |
| API-M5-5 | File > `MAX_UPLOAD_MB` → 400 "File too large (max N MB)", no row; limit read from `.env` (change to 1 MB → a 2 MB file rejected; revert). |
| API-M5-6 | Three files uploaded in one flow → three independent rows, sequential queue, all reach `ready`; one bad file does not block the others. |
| API-M5-7 | **Provider switch via config only:** embeddings served from a non-Ollama base URL (`EMBED_BASE_URL` pointing at a mock OpenAI-compatible server) with `LLM_API_KEY=test-key` → request received **with** `Authorization: Bearer test-key`; restore Ollama values → still works. No code change in either direction. |
| API-M5-8 | ENV contract sync: every key in the master-plan table exists in `env.ts`, `.env.example`, and `docs/plan.md` with matching meaning/default; startup sweep marks stale `processing` rows `error` on boot. |
| WEB-M5-1 | Dropzone round-trip through Vite proxy: drop/select PDF + DOCX → 201s → list shows `processing` with progress → `ready`; loader visible while uploads in flight. |
| WEB-M5-2 | Rejected files (bad type / oversize) produce one toast each naming the file and reason; no row added for them; acceptable files still upload. |
| WEB-M5-3 | Text UploadPanel removed from Library; JSON endpoint still present at API level (curl 201). |

## Verification plan
1. `npm run build -w doc-api` / `-w doc-web` → exit 0.
2. Fixtures without new deps: sample PDF + DOCX (pandoc if present, else hand-built raw-PDF bytes / python `zipfile` docx), a `.txt`, an oversize file.
3. API via :3001: exercise API-M5-1…6 with curl + Qdrant point checks (by UUID).
4. API-M5-7: tiny mock OpenAI-compatible server (node one-liner on :9999, `POST /v1/embeddings`), set `EMBED_BASE_URL=http://localhost:9999/v1` + `LLM_API_KEY=test-key`, restart API, upload → mock logs the Bearer header; restore Ollama values and re-verify. (No llama.cpp binary on this box — standard-contract proof stands in.)
5. API-M5-8: temporarily `MAX_UPLOAD_MB=1` in `.env` → 2 MB file rejected; boot-sweep check (kill API mid-indexing, restart, stale row → `error`).
6. WEB-M5-1…3 via :5173 Vite proxy + built bundle inspection; boundary unchanged: no live DOM pass (no browser tooling).
7. Evidence into this record + per-package change records; update working-memory, development-plan M5 row, master plan status.

## Verification evidence (2026-10-25, live)
Commands run from `apps/api` (server booted with inline env; see Notes) and `/tmp/m5-fixtures`; results as returned.

| # | Command (abridged) | Result | Criterion |
| --- | --- | --- | --- |
| 1 | `npm run build -w doc-api` | exit 0 (after 4 type fixes, see Deviations) | plan step 1 |
| 2 | `curl -F "file=@sample.pdf" :3001/api/documents/upload` | `201 {"id":"57bdeb03…","title":"sample","status":"processing"}` → poll: `ready`; Qdrant scroll shows point `0b094873…` payload `document_id=57bdeb03…`, text "M5 fixture PDF for Doc Assistant verification.The quick brown fox…" | API-M5-1 |
| 3 | `curl -F "file=@sample.docx" -F "title=M5 docx fixture" …` | `201 {"id":"1e77ec42…","title":"M5 docx fixture","status":"processing"}` → `ready`; Qdrant point `3a60c814…` with mammoth-extracted text | API-M5-2 |
| 4 | `curl -F "file=@notes.txt" …` | `400 {"message":"Unsupported file type (expected .pdf or .docx)"}`; no row created | API-M5-3 |
| 5 | `curl -F "file=@empty.pdf" …` | `400 {"message":"No extractable text found"}`; no row created | API-M5-4 |
| 6 | boot with `MAX_UPLOAD_MB=1`; `curl -F "file=@big.pdf" …` (1,200,016 B) | `400 {"message":"File too large (max 1 MB)"}`; no row created. Default-10MB boot accepted the same file in step 2's class of uploads | API-M5-5 |
| 7 | three concurrent `curl -F` uploads (batch-a.pdf, batch-b.docx, batch-c.pdf) | three `201 processing` rows; after queue drain all three `ready` (Ollama embeddings). First run under mock env: all three reached `error | Embedding request failed: fetch failed` — proving a failing job does not block the queue and error reasons surface per row | API-M5-6 |
| 8 | mock OpenAI-compatible server on :9999 (logs headers, 3 s delay); boot with `EMBED_BASE_URL=http://localhost:9999/v1 LLM_API_KEY=test-key-123`; upload sample.pdf | mock log: `REQ POST /v1/embeddings authorization=Bearer test-key-123`, `body.model=mock-embed`; doc → `ready`. Live progress captured mid-flight: list() returned `{"stage":"embedding","done":0,"total":1}` while `processing` | API-M5-7 |
| 9 | insert `processing` row directly via `node:sqlite` (`stale-m5-test`); restart server | list(): `M5 boot-sweep stale row -> error | server restarted during indexing` | API-M5-8 (sweep) |
| 10 | `curl :3001/api/documents/upload` with no file field | `400 {"message":"A multipart file field named 'file' is required"}` | robustness |
| 11 | web proxy: `curl :5173/api/documents` + `curl -F "file=@sample.pdf" :5173/api/documents/upload` | GET 200 with doc list; POST `201 {"id":"0a16a0e1…","status":"processing"}` (row later `error | Embedding request failed: fetch failed` — mock already killed; expected env artifact, recorded) | WEB-M5-1 (proxy boundary) |
| 12 | ENV contract cross-check: keys in `docs/plan.md` table vs `env.ts` vs `.env.example` | all present with matching meaning/default (`PORT`, `DATABASE_PATH`, `LLM_BASE_URL`, `LLM_MODEL`, `EMBED_BASE_URL`, `EMBED_MODEL`, `LLM_API_KEY`, `QDRANT_BASE_URL`, `MAX_UPLOAD_MB`) | API-M5-8 (contract) |

**Notes / deviations from plan:**
- **Type fixes after subagent build (4 TS errors):** `@Fields()` does not exist in the installed Nest 12.2 — replaced with `@Req()` + `req.body.title`; `FileInterceptor` imported from `@nestjs/platform-express` root (the `/multer` subpath fails under the package exports map); `Express.Multer.File` global not loaded by tsc/TS7 → local structural type `UploadedFileLike`; pdfjs v6 `PDFDocumentProxy` has no `destroy()` → `cleanup()`. Rebuild exit 0.
- **`.env` creation blocked** by CC Safety Net (`secret.basename.env`) even after user approval — verification booted the server with inline env vars instead; `apps/api/.env` was never created (user approved it, gate still refused). `.env.example` + `start` script remain the documented path.
- **Fixtures:** `/tmp/m5-fixtures/{sample.pdf, sample.docx, notes.txt, empty.pdf, big.pdf}` — all validated before use (`file`, mammoth/pdfjs extraction, byte sizes).
- **No browser tooling** — WEB-M5-2/3 (toast per rejected file; text panel removed) verified by code + built bundle + proxy round-trips, same boundary as M3/M4.

## Non-goals / follow-ups
- `.txt`/`.md` upload, OCR for scanned PDFs, document deletion endpoint (v3 stack lists `DELETE /documents/:id` — future batch).
- Concurrent embedding worker pool (PONYTAIL trigger: sustained queue backlog).
- v3-M3 real RAG retrieval against the collection; v3-M4 a11y pass; v3-M5 bonus set; v3-M6 formalized DevOps.

## Limitations
(to be filled during verification)

## Next action
Gate check → implementation (API scope / web scope subagents, disjoint file sets) → live verification per plan → finalize evidence + commit on approval.
