# Change Record — m8-chat-experience (authoritative)

- **Goal:** M8 (root batch 8; the user's v3-M5 feature set) — a usable chat experience and document lifecycle: conversation history, selectable scope, real markdown + inline citations, in-chat direct-document upload, Knowledge/Library split, document deletion, and a unit + E2E test harness.
- **Status:** **Complete — all gates green** (root build exit 0 · API vitest 18/18 · web vitest 20/20 · Playwright E2E 5/5 in 26.2s). Awaiting commit approval.
- **Assignment:** API → **Groq** subagent (`groq/qwen/qwen3.8-27b`); web non-chat → **Cerebras** subagent (`cerebras/qwen-3.8-27b`); chat flagship + E2E + specs + integration → **lead** (orchestrator + developer).
- **Frozen contract preserved:** `POST /chat/stream` still emits flat SSE `citation*→chunk*→done|error`; 502 pre-first-byte `{error}`; validation 400. Client maps flat→nested at the parse boundary.

## Scope (requirements → feature)
1. **Conversation history** — sessions persisted server-side; start new / revisit past. (`API-M8-1…3`, `WEB-M8-6…7`)
2. **Selectable "Scoped to"** — chat scope button becomes a real document picker. (`WEB-M8-4`)
3. **Markdown + inline citations** — render assistant markdown; `[n]` → clickable chip linking the source doc. (`WEB-M8-1…3`)
4. **In-chat drag-drop upload (direct mode)** — parse doc, send full text to LLM (no RAG), inline citations to doc+section/page; stored as a chat-origin document. (`API-M8-4…6`, `WEB-M8-5`)
5. **Knowledge/Library split** — current Library → Knowledge (RAG docs, uploadable); new Library lists only chat-origin docs, no upload. (`API-M8-7`, `WEB-M8-8…9`)
6. **Remove documents** — delete a doc from its list (and Qdrant points if knowledge). (`API-M8-8`, `WEB-M8-10`)
7. **Testing** — vitest unit tests (both apps) + playwright E2E. (`TEST-M8-1…4`)

## Design delta

### Schema (SQLite, additive; idempotent migration via existing `PRAGMA table_info` guard)
- `documents.origin TEXT NOT NULL DEFAULT 'knowledge'` — `knowledge` | `chat`. Backfill existing rows to `knowledge`.
- `documents.content TEXT NULL` — extracted text for **chat** docs (not embedded). Knowledge docs keep text in Qdrant points. PONYTAIL: ceiling = large chat docs bloat SQLite; upgrade = file/object store; trigger = docs > ~5 MB or many chat uploads.
- New `sessions(id TEXT PK, title TEXT, created_at REAL, updated_at REAL)`.
- New `messages(id TEXT PK, session_id TEXT, role TEXT CHECK('user'|'assistant'), content TEXT, citations TEXT NULL, created_at REAL)` — `citations` is a JSON array of `{documentId,title?,page?}` for the assistant message.

### API endpoints (new / changed)
- `DELETE /documents/:id` → 204 on success, 404 if absent. If `origin=knowledge`, also delete its Qdrant points (`deletePoints(documentId)` in `ingest.ts`). If `origin=chat`, remove row only.
- `GET /documents?origin=knowledge|chat` → filter; default (no param) returns all (back-compat).
- `POST /chat/documents` (multipart, field `file`, optional form `title`) → extract via existing `extractText`; insert row `origin='chat'`, `status='ready'`, `content=<text>`, `pages`, `size_bytes`; **no** embed/queue. 201 `{id,title,pages}`; 400 for unsupported type / no text (reuse `UnsupportedFileTypeError`/`NoExtractableTextError`).
- `GET /sessions` → list, most-recent-first (`{id,title,createdAt,updatedAt}`).
- `POST /sessions` → create (201 `{id,...}`); optional `title`.
- `GET /sessions/:id` → session + ordered messages. 404 if absent.
- `POST /chat/stream` body gains `sessionId?` and `attachments?: string[]` (document ids). When `attachments` non-empty → **direct mode** over those docs; else existing RAG mode. If `sessionId` present, server loads last N messages from `messages` as context (client `history` retained only as fallback) and appends user+assistant after the stream completes.

### Direct-mode citation flow
- One `citation` SSE event per attached doc: `{documentId,title,pages}` (index 1..N in request order).
- System prompt lists attached docs by number, instructs inline `[1]…[n]` references and naming section/page where possible.
- Client pre-transforms `[n]`→`[n](#cite-n)`; custom `a` component renders `#cite-N` hrefs as chips linking to `/documents/:id`.

### Web (client)
- `lib/api.ts` (Cerebras, single writer): `listDocuments({origin?})`, `deleteDocument(id)`, `uploadChatDocument(file,title?)`, `listSessions()`, `createSession(title?)`, `getSession(id)`; `streamChat(...)` extended with `sessionId?`/`attachments?`.
- **Knowledge** page = renamed current Library (route `/knowledge`; `/` redirects there); keeps upload dropzone.
- **Library** page (new, route `/library`) lists `origin=chat` docs, no dropzone, per-doc delete button.
- `App.tsx` routes + `AppShell.tsx` nav → Knowledge + Library + Chat.
- **ChatPage** (lead): markdown via `react-markdown`+`remark-gfm`; inline citation chips; selectable "Scoped to" picker (ready knowledge docs + "All"); drag-drop upload in composer → attach to next message; conversation history (new/revisit) replacing in-memory-only `historyRef`.

## File operations (owner)
| Path | Op | Owner | Requirement |
| --- | --- | --- | --- |
| `apps/api/src/lib/db.ts` | modify (schema + migration) | Groq | M8-1,7 |
| `apps/api/src/documents/ingest.ts` | add `deletePoints` | Groq | M8-8 |
| `apps/api/src/documents/{documents.service,documents.controller}.ts` | delete / origin filter / chat-upload | Groq | M8-4,6,7,8 |
| `apps/api/src/chat/{chat.service,chat.controller}.ts` | sessions + direct mode | Groq | M8-1…3,5 |
| `apps/api/src/**.test.ts`, `apps/api/vitest.config.ts` | new (API unit tests) | Groq | TEST-M8-1,2 |
| `apps/web/src/lib/api.ts` | extend client surface | Cerebras | all web |
| `apps/web/src/pages/{KnowledgePage,LibraryPage}.tsx`, `App.tsx`, `components/AppShell.tsx` | rename + new page + nav | Cerebras | M8-4,7,8,9,10 |
| `apps/web/src/**.test.tsx`, `apps/web/vitest.config.ts` | new (web unit tests) | Cerebras | TEST-M8-3 |
| `apps/web/src/pages/ChatPage.tsx`, `components/Markdown.tsx`, `lib/markdown.ts` | chat flagship | lead | M8-1…5, WEB-M8-1…7 |
| `e2e/**`, root `playwright.config.ts` | new (E2E) | lead | TEST-M8-4 |
| `package.json` (root/api/web) | add deps + test scripts | lead | all |

## Requirement → step → test mapping (summary)
- M8-1…3 (sessions): db tables + service load/save + controller endpoints → Groq; ChatPage history UI → lead. Test: API vitest (session CRUD, context load); E2E new/revisit.
- M8-4 (direct upload): `POST /chat/documents` + direct-mode prompt → Groq; composer dropzone → lead. Test: API vitest (extract+store no-embed, direct prompt); E2E upload→answer+citations.
- M8-5/7 (origin split): `origin` column + filter → Groq; Knowledge/Library pages → Cerebras. Test: API vitest (filter); web vitest (page render).
- M8-8 (delete): service.delete + deletePoints + DELETE endpoint → Groq; buttons → Cerebras/lead. Test: API vitest (row+points removed); E2E delete.
- WEB-M8-1…3 (markdown+citations): ChatPage + Markdown component → lead. Test: web vitest (`[n]`→chip transform, markdown renders).
- TEST-M8-4 (E2E): playwright specs → lead.

## Phases & dependencies
1. **Phase 0 (lead):** this record + PRD deltas; add deps to `package.json`s; `npm install`; pin `api.ts` contract.
2. **Phase 1 (parallel):** Groq→API+API vitest · Cerebras→web non-chat+web vitest · lead→ChatPage against pinned contract.
3. **Phase 2 (lead):** reconcile, full `npm run build`, all vitest, playwright E2E vs live app; update this record + component change records with evidence.

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-M8-1 | `GET/POST /sessions`, `GET /sessions/:id` create/read sessions and ordered messages; 404 on unknown session. |
| API-M8-2 | `POST /chat/stream` with `sessionId` loads last-N server history as context and appends user+assistant after the stream. |
| API-M8-3 | Session list is most-recent-first and reflects new/updated sessions. |
| API-M8-4 | `POST /chat/documents` extracts, stores `origin='chat'` + `content`, **no** Qdrant points; 201 `{id,title,pages}`; bad type/no text → 400, no row. |
| API-M8-5 | Direct mode (`attachments`) sends attached docs' full text as context and emits one `citation` event per attached doc. |
| API-M8-6 | Direct mode takes precedence over RAG scope for a message that has attachments; otherwise RAG applies. |
| API-M8-7 | `GET /documents?origin=chat` returns only chat docs; `?origin=knowledge` only knowledge; no param → all. |
| API-M8-8 | `DELETE /documents/:id` removes the row and (for knowledge) its Qdrant points; 204 then absent from list; 404 if unknown. |
| WEB-M8-1 | Assistant answers render real markdown (headings, bold, lists), not literal `**`/`##`. |
| WEB-M8-2 | Inline `[n]` markers render as clickable chips linking to `/documents/:id`. |
| WEB-M8-3 | Citation chip shows the source document title (+ page when known). |
| WEB-M8-4 | "Scoped to" opens a picker of ready knowledge docs + "All documents"; selection scopes retrieval. |
| WEB-M8-5 | Dropping a file in chat uploads it (visible in Library) and attaches it to the next message's answer with inline citations. |
| WEB-M8-6 | New session can be started; past sessions can be revisited and persist across reload. |
| WEB-M8-7 | Conversation history is server-backed (not only in-memory). |
| WEB-M8-8 | Knowledge page = RAG docs with upload; Library page = chat docs only, no upload control. |
| WEB-M8-9 | Nav shows Knowledge + Library + Chat; `/` redirects to Knowledge. |
| WEB-M8-10 | Delete button removes a doc from its list (and refreshes). |
| TEST-M8-1 | API vitest suite passes (chunking, pagination, migration idempotency, session CRUD, direct-mode prompt, delete). |
| TEST-M8-2 | API tests isolate the DB (temp/in-memory `DATABASE_PATH`) and mock Qdrant/LLM. |
| TEST-M8-3 | Web vitest suite passes (Knowledge/Library render + delete, `api.ts` helpers, markdown/citation transform). |
| TEST-M8-4 | Playwright E2E passes: upload→chat→answer+citations; RAG vs direct; Knowledge/Library split; delete; new/revisit session. |

## Assumptions / open decisions (resolved)
- Direct mode takes precedence over RAG for a message with attachments; else RAG.
- Chat docs store `content` (no embedding); knowledge docs stay Qdrant-backed.
- `/` redirects to Knowledge (preserves current landing behavior).
- Markdown via `react-markdown`+`remark-gfm` (chosen over hand-rolled for GFM correctness + testability).
- New deps: api devDeps `vitest`; web deps `react-markdown`,`remark-gfm`; web devDeps `vitest`,`jsdom`,`@testing-library/react`,`@playwright/test`.
- No commits until separately approved.

## Evidence (Phase 2 — actual results, 2026-10-26)
- **Build:** `npm run build` (root; api `tsc` + web `tsc && vite build`) → **exit 0**.
- **API vitest** (`npm run test -w apps/api`): **18/18 passed**, 4 files — `db-migration.test.ts` (3), `sessions.service.test.ts` (7), `chat.service.test.ts` (4), `documents.service.test.ts` (4). DB isolated per-file via temp `DATABASE_PATH`; Qdrant mocked.
- **Web vitest** (`npm run test -w apps/web`): **20/20 passed**, 5 files — `markdown.test.ts` (4), `api.test.ts` (7), `LibraryPage.test.tsx` (3), `KnowledgePage.test.tsx` (2), `Markdown.test.tsx` (4).
- **Playwright E2E** (`npm run test:e2e`, chromium 1248, vs live stack :5173→:3001): **5/5 passed in 26.2s**:
  - `chat.spec.ts` — direct mode (attach PDF → answer + inline citation chip linking `/documents/:id`) ✓ 4.7s; RAG mode (no attachment → streamed knowledge-base answer) ✓ 11.3s; sessions (start → New conversation → revisit from past-conversations list, transcript re-renders with citation) ✓ 8.8s.
  - `knowledge.spec.ts` — lists a knowledge doc, upload dropzone present, delete removes it ✓ 522ms.
  - `library.spec.ts` — lists a chat doc, NO file input on page, remove deletes it ✓ 476ms.
- **Live smoke (curl):** `POST /api/chat/documents` → `{origin:chat,status:ready}`; `POST /api/chat/stream {attachments:[id]}` → first event `citation {documentId,title:"M8 Sample Report",page:1}` then chunk deltas citing `[1]`.
- **Route fix verified:** web session calls corrected `/api/sessions`→`/api/chat/sessions`; live proxy `curl :5173/api/chat/sessions` → `[]`.
- **Live click-through (user):** pending — user to verify both themes at http://localhost:5173.
