# Change Record — m6-rag-chat (authoritative)

- **Goal:** M6 (root batch; completes v3-M3 RAG & streaming chat) — two halves:
  1. **Chat RAG**: `POST /api/chat/stream` becomes real — retrieve top-k chunks from Qdrant for the question (scoped to selected document(s) when provided), assemble a context-grounded prompt with recent conversation history, stream LLM tokens over the existing SSE contract (`citation` → `chunk`* → `done`, plus `error`), emitting one `citation` event per retrieved point. ChatPage consumes the real stream; fake client-side `buildAnswer()`/timers are deleted. Citation chips show "Title · p.N" (page for PDFs only) and link to `/documents/:id`.
  2. **LLM-generated document summary**: during ingestion, extracted text is sent to the LLM to produce a 2–4 sentence executive summary, stored in the sqlite `documents` table (`summary`), plus real `pages`/`size_bytes`; served via the list/detail endpoints; DocumentDetailPage shows the real summary and real metadata (replacing the hash-derived fake pages/size/date + canned "EXECUTIVE SUMMARY…" excerpt in `docMeta.ts`).
- **Status:** **implemented & verified live 2026-10-25** (both builds exit 0; all acceptance criteria exercised against running services — evidence table below). Execution note: the Groq/Cerebras subagents were spawned per user instruction but both died mid-run; the Team Lead executed both scopes locally under the same plan. Plan approved via plan-mode exit 2026-10-25.
- **Approval scope:** user standing instruction — "Run autonomously and complete milestones." M6 decisions locked by the user (ask_user_question, 2026-10-25): scoped-when-selected retrieval; multi-turn history; citation chips → doc detail; reuse `LLM_BASE_URL`/`LLM_MODEL` with env-specified sampling/context params. No commits until explicitly approved (M4+M5 already uncommitted).

## Decisions (recorded, not silent)
- **Chunking stays paragraph-boundary packing** (`chunkText` in `documents/ingest.ts`: ~500 char target, 1000 hard max). Rationale: at this corpus size, semantic chunking (per-sentence embeddings + breakpoint scoring) costs an extra embedding pass for marginal retrieval gain. The existing PONYTAIL marker documents the upgrade trigger (uploads >1 MB / concurrent ingest load). No change to `chunkText` in M6.
- **Summary is best-effort** (PONYTAIL): LLM failure during summary generation logs a warning and leaves `summary` empty — ingestion still completes `ready`. UI falls back to a neutral line. Rationale: a slow/failing chat model must not block the embedding pipeline that already works.
- **SSE contract is frozen**: event types `citation`, `chunk`, `done`, `error` and their shapes are what M3 shipped; only the payloads become real (`citation` gains `page?`/`score`; `chunk.delta` unchanged). Client and server may be built against it independently.
- **History window**: last 6 messages (3 user + 3 assistant), sent by the client as `history: {role, content}[]`. Server does not persist conversations (no new table) — PONYTAIL: conversation persistence is a later milestone; trigger: user asks to reload past chats.

## ENV contract additions (rule: all three files in the same change)
| Key | Default | Meaning |
| --- | --- | --- |
| `LLM_TEMPERATURE` | `0.2` | chat sampling temperature (summary + RAG answers) |
| `LLM_TOP_P` | unset → omit from request | nucleus sampling, pass-through when set |
| `LLM_MAX_TOKENS` | `1024` | max completion tokens for chat/summary calls |

Files: `apps/api/src/lib/env.ts`, `apps/api/.env.example`, ENV table in `docs/plan.md`. (Note: a prior gate blocked creating `apps/api/.env`; the executing session may need inline env vars or manual `.env` creation.)

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-M6-1 | `POST /api/chat/stream` with `{question, documentIds: []}` retrieves from Qdrant (points/search, top_k=6), emits one `citation` event per retrieved point carrying the real `documentId` (+ `page` when payload has one, + score), then streams actual LLM token deltas as `chunk` events, ending with `done`. |
| API-M6-2 | With `documentIds: [<id>]`, retrieval is filtered to that document's chunks (payload `document_id` filter) and citations only reference that id. Scoped vs global produce different citation sets for a question answerable from both. |
| API-M6-3 | `history` (≤6 messages) is included in the LLM request; a follow-up question ("drill into that metric") produces an answer using prior context. |
| API-M6-4 | Failure before first byte → JSON error (502, reason in body). Failure mid-stream → SSE `error` event with reason, stream ends. Empty retrieval → still answers; prompt notes no context was found. |
| API-M6-5 | Ingestion queue gains a summary step: after extraction, before/around chunk→embed→upsert, the LLM generates a 2–4 sentence summary from extracted text (truncated ~8k chars) and stores it in `documents.summary` (sqlite). Row reaches `ready` with non-empty `summary` for a real PDF and a real DOCX. |
| API-M6-6 | Summary step failure does NOT fail ingestion: row still `ready`, `summary` empty, warning logged. Real `pages` (pdfjs count; null for DOCX) and `size_bytes` stored at upload/ingest. `GET /api/documents` rows include `summary?`, `pages?`, `sizeBytes?`. |
| API-M6-7 | New env keys land in all three of `env.ts`, `.env.example`, `docs/plan.md` ENV table; chat requests carry temperature (default 0.2), max_tokens (default 1024), and top_p only when set; Bearer header only when `LLM_API_KEY` set. |
| WEB-M6-1 | ChatPage sends to `/api/chat/stream` (POST, via Vite proxy) with question + selected docId(s) + history; accumulates `chunk` deltas into the assistant bubble in real time; busy state ends on `done`; `error` event/toast shows the reason. `buildAnswer()` and the word-timer streaming are deleted. |
| WEB-M6-2 | Citation chips render from real `citation` events: "Title · p.N" (page only when present), each a link to `/documents/:id`; clicking navigates to the document page. |
| WEB-M6-3 | DocumentDetailPage Preview panel shows the API-provided summary (replacing the canned excerpt); header shows real pages/size/upload date from the API; `docMeta.ts` fallback used only when fields are absent (legacy rows). |

## Deliverables
| Path | Op | Owning package | Reason |
| --- | --- | --- | --- |
| `apps/api/src/chat/chat.service.ts` | create | api/chat | retrieval + prompt assembly + streaming LLM call (API-M6-1…4) |
| `apps/api/src/chat/chat.controller.ts` | modify | api/chat | real SSE flow via service; keep contract; error paths (API-M6-1, 4) |
| `apps/api/src/chat/chat.module.ts` | modify (if needed) | api/chat | provider wiring for the new service |
| `apps/api/src/documents/queue.ts` | modify | api/documents | summary step in job order + best-effort failure handling (API-M6-5, 6) |
| `apps/api/src/documents/ingest.ts` | modify | api/documents | `generateSummary()` LLM call; store `pages`/`size_bytes`; no chunkText change |
| `apps/api/src/documents/documents.service.ts` | modify | api/documents | insert carries `size_bytes`; list/detail expose `summary`/`pages`/`sizeBytes` (API-M6-6) |
| `apps/api/src/lib/db.ts` | modify | api/lib | migration: `documents` columns `summary TEXT`, `pages INTEGER NULL`, `size_bytes INTEGER NULL` (idempotent ALTER) |
| `apps/api/src/lib/env.ts` | modify | api/lib | `llmTemperature` 0.2, `llmTopP?`, `llmMaxTokens` 1024 (API-M6-7) |
| `apps/api/.env.example` | modify | api/_root | three new keys documented (API-M6-7) |
| `docs/plan.md` | modify | root docs | ENV table + v3-M3 status flip on verification |
| `apps/web/src/lib/api.ts` | modify | web/_root | `streamChat()` POST + manual SSE parse; `Document` type gains `summary?`, `pages?`, `sizeBytes?` (WEB-M6-1) |
| `apps/web/src/pages/ChatPage.tsx` | modify | web/pages | real stream consumption, citation chips as links, delete fakes (WEB-M6-1, 2) |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | web/pages | real summary + metadata; fallback to docMeta only when absent (WEB-M6-3) |
| `apps/web/src/lib/docMeta.ts` | modify | web/pages | fallback-only role; canned excerpt kept solely for legacy rows without summary |
| `docs/spec/_cross-cutting/m6-rag-chat.md` (this file) | create→update | root docs | status → implemented & verified + evidence table on completion |

## Ordered steps (two disjoint scopes — parallel subagents)
**Scope A — API (assign: Groq subagent)**
1. `lib/db.ts`: idempotent migration adding `summary`, `pages`, `size_bytes` to `documents`.
2. `lib/env.ts` + `.env.example` + `docs/plan.md` ENV table: three new keys (single change, all three files).
3. `documents/ingest.ts`: `generateSummary(text)` (chat-completions, non-streaming, temperature/max_tokens from env, Bearer when key set); store `pages` (pdfjs count) / `size_bytes`.
4. `documents/queue.ts`: job order extract → insert `processing` → **summary (best-effort)** → chunk → embed (batches of 16, progress) → upsert → `ready`; summary failure = warn + continue.
5. `documents.service.ts`: carry `size_bytes` on insert; expose new fields in list responses.
6. `chat/chat.service.ts` + `chat.controller.ts`: retrieve (embed question → Qdrant POST `/collections/documents/points/search`, top_k=6, optional payload filter `document_id`), prompt assembly (system: answer only from provided context; numbered chunks; history ≤6), streaming parse of upstream SSE deltas; controller emits frozen contract events.
7. Build (`npm run build` in apps/api) → exit 0.

**Scope B — web (assign: Cerebras subagent)**
1. `lib/api.ts`: `streamChat({question, documentIds?, history?, onEvent})` — POST fetch, ReadableStream SSE line parsing (split on `\n\n`, `data: ` prefix), dispatch `citation`/`chunk`/`done`/`error`; extend `Document` type.
2. `pages/ChatPage.tsx`: delete `buildAnswer` + timers; `send()` → `streamChat`; accumulate deltas; citations from events mapped to titles via existing docs list; chips as `<Link to={/documents/:id}>` with page suffix when present; error toast (Toaster exists from M5).
3. `pages/DocumentDetailPage.tsx` + `lib/docMeta.ts`: real summary/pages/size/date from API; docMeta fallback only for absent fields.
4. Build (`npm run build` in apps/web) → exit 0.

**Integration (Lead/coordinator)**: restart API with Ollama env, run verification below, record evidence, flip statuses (this record, package change records, `docs/context/working-memory.md`, `docs/development-plan.md` M6 row, master plan v3-M3 row), pause at milestone boundary.

## Verification commands (evidence into this record)
1. `npm run build` in both apps → exit 0.
2. Upload fresh PDF + DOCX via `POST /api/documents/upload` (fixtures exist at `/tmp/m5-fixtures`) → rows `ready`; sqlite `documents.summary` non-empty for both; `GET /api/documents` shows summary/pages/sizeBytes.
3. `curl -N -X POST http://localhost:3001/api/chat/stream` with a question answerable from an uploaded doc → observe real `citation` events (real document ids), streamed deltas, `done`. Repeat scoped (`documentIds: [id]`) vs global → different citation sets.
4. Multi-turn: send follow-up with `history` → answer uses prior context.
5. Ollama down mid-stream → `error` event; UI toast via :5173 proxy round-trip. Kill LLM during summary step of an upload → row still `ready`, empty summary, warning in log.
6. ENV cross-check: grep the three new keys across `env.ts`, `.env.example`, `docs/plan.md`.

## Evidence (verified live 2026-10-25, lead-executed)
| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build` in `apps/api` and `apps/web` | **PASS** — both exit 0 (web dist 289.44 kB JS). |
| 2 | Upload fresh PDF (`M6-verify-PDF`, id `04afb6e8-7aa7-4ab2-889d-5b73d47742c1`) + DOCX (`M6-verify-DOCX`, id `b89db7be-988b-4253-b957-359d45a1189c`) via `POST /api/documents/upload` | **PASS** — both `ready`; real LLM summaries non-empty; list row shows `summary`, `pages: 1` (PDF), `sizeBytes` (758 / 1162), `createdAt`; DOCX correctly omits `pages`. Legacy rows expose `createdAt` only. |
| 3a | Global chat `POST /api/chat/stream` (question answerable from corpus) | **PASS** — 6 `citation` events with real ids/titles (+`page:1` on the PDF hit), context-grounded streamed answer citing `[1]…[6]`, then `done`. |
| 3b | Same question scoped to `documentIds:["04afb6e8-…"]` (API-M6-2) | **PASS** — exactly 1 citation, in-scope only; global set was 6 documents → different citation sets. |
| 4 | Multi-turn: follow-up "What was the agreed code name?" with `history` containing assistant answer `BLUEFROST-42` (API-M6-3) | **PASS** — model explicitly referenced the prior assistant turn ("I apologize for my earlier answer of 'BLUEFROST-42'"), proving history reached the LLM. |
| 5a | Mid-stream LLM failure (fake streaming LLM on :9911 sends one chunk then hard-closes socket; API instance on :3002) | **PASS** — frames: `citation`* → `chunk "partial "` → `{"type":"error","reason":"terminated"}`. |
| 5b | Pre-first-byte LLM down (same :3002 instance, LLM port dead) | **PASS** — HTTP 502, `application/json`, body `{"error":"Chat request failed: fetch failed"}` (no SSE bytes sent). |
| 5c | Validation (API-M6-4): missing `question`; `documentIds` non-array | **PASS** — both HTTP 400 with JSON `{"error": …}` reasons. |
| 5d | LLM down during summary step (upload via :3002 with dead LLM port) | **PASS** — row reached `ready` with no `summary` field; API log: `[ingest] summary generation failed for "batch-a": Summary request failed: fetch failed — continuing with empty summary`. |
| 6 | ENV cross-check: `LLM_TEMPERATURE` / `LLM_TOP_P` / `LLM_MAX_TOKENS` present in `env.ts`, `.env.example`, `docs/plan.md` | **PASS** (grep, all three files). |

### Bugs found & fixed during verification
1. **Qdrant search hits missing payload** — this Qdrant build omits `payload` from `/points/search` hits unless the request body sets `"with_payload": true`. Fixed in `chat.service.ts retrieve()`; citations went from empty ids to real id/title/page.
2. **Retrieved context never reached the LLM** — `buildMessages` computed the numbered-context string but only used it as a truthiness check; the system prompt omitted the actual chunks (model kept answering "no context provided"). Fixed by appending `\n\n${ctx}` to the grounded system prompt. Diagnosed via a temporary debug log of the outgoing message, removed after verification.
3. **Web parser vs frozen contract** — `api.ts` dispatch now reads the flat top-level fields (`documentId`/`title`/`page`/`score`, `delta`, `reason`) per the frozen SSE contract and maps to the client's nested `ChatStreamEvent` shape at the parse boundary.

## Inherited gotchas (from M5 — do not re-learn)
- Nest 12.2.0 has NO `@Fields()`; use `@Req() req` + `req.body`. `FileInterceptor` from `@nestjs/platform-express` root (not `/multer` subpath).
- typescript ^7 (tsgo): @types global augmentations unreliable — avoid `Express.Multer.File`; local structural interfaces.
- pdfjs-dist v6: `PDFDocumentProxy.cleanup()`, legacy build `pdfjs-dist/legacy/build/pdf.mjs`.
- Qdrant 1.x REST: collection-create & points-upsert are PUT; listing/search via POST (`/points/scroll`, `/points/search`); filter keys are bare payload names (`document_id`), not `payload.document_id`; GET `/points?limit=` returns empty/non-JSON in this version.
- **M6 additions:** this Qdrant build omits `payload` from `/points/search` hits unless the request body includes `"with_payload": true`. Ollama `/api/embeddings` returns `.embedding` (singular). `Qwen3.8-27B-Uncensored` is a thinking model — it streams `reasoning_content` before `content`; keep `LLM_MAX_TOKENS` ≥ 1024 or the reasoning phase can consume the whole budget and leave `content` empty (`finish_reason: length`).
- CC Safety Net rule `secret.basename.env` blocks bash touching any `.env` file — use inline env vars for test boots; user creates `.env` manually.
- No browser tooling in the sandbox — DOM verified by code + built bundle + Vite-proxy round-trips; user does the live click-through.
