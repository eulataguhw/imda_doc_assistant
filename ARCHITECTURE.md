# Architecture

Doc Assistant is a local-first, provider-agnostic RAG application in an **npm-workspaces monorepo** with two apps and no shared build tooling beyond the root `package.json`.

```
doc-assistant/
├─ package.json            # workspaces: ["apps/*"]; root scripts (build/test/lint/dev)
├─ apps/api/               # doc-api — NestJS 12 REST + SSE service
│   └─ src/
│       ├─ app.module.ts   main.ts
│       ├─ documents/      # upload → extract → chunk → embed → Qdrant (background queue)
│       ├─ chat/           # retrieve → prompt → LLM stream → SSE; sessions/messages
│       └─ lib/            # db.ts (node:sqlite), env.ts (config)
├─ apps/web/               # doc-web — React 19 SPA (Vite + Tailwind v4)
│   └─ src/
│       ├─ App.tsx         main.tsx
│       ├─ pages/          # ChatPage · KnowledgePage · LibraryPage · DocumentDetailPage
│       ├─ hooks/          # useChatStream · useDocuments
│       ├─ components/     # AppShell · Markdown · StatusBadge · Toaster (presentational)
│       ├─ lib/            # api.ts · constants · types · stores/{documents,sessions}
│       └─ styles/globals.css
├─ e2e/                    # Playwright upload→question integration tests
├─ data/                   # SQLite file + Ollama model cache (gitignored)
├─ docker-compose.yml      # ollama · qdrant · api · web
└─ .github/workflows/ci.yml
```

## Monorepo layout

- **Package manager:** npm workspaces (`workspaces: ["apps/*"]`). Dependencies hoist to the root `node_modules/`; there is no lockfile-format coupling (the repo ships a `package-lock.json`).
- **`apps/api`** — NestJS 12 on Express. Responsibilities: document ingestion and indexing, vector retrieval, prompt construction, LLM streaming, and session/message persistence. It is the only process that talks to Qdrant, Ollama/llama.cpp, and SQLite.
- **`apps/web`** — React 19 SPA built with Vite. Responsibilities: presentation, client state (Zustand), routing, and consuming the API over REST + SSE. In dev it proxies `/api` → `:3001`; in the Docker build nginx does the same.
- **No frontend framework server layer.** The challenge allows "Next.js *or* Vite + React"; this project chose **Vite + React** with client-side routing via `react-router`, justified by the fact that all heavy lifting (ingestion, retrieval, streaming) lives behind a thin API — there is no server-rendered content or per-route data-fetching to gain from Next's SSR/SSG. The SPA is served statically (nginx in prod), which keeps the LLM/streaming boundary clean and testable.

## API module breakdown (`apps/api/src`)

### Documents pipeline — `documents/`

The ingestion path is split into small, independently testable units:

| File | Responsibility |
| --- | --- |
| `documents.controller.ts` | HTTP surface: `GET /documents?origin=`, `DELETE /documents/:id`, `POST /documents` (JSON text), `POST /documents/upload` (multipart `file`, `.pdf`/`.docx`) |
| `documents.service.ts` | Orchestration: validation, extraction, row upsert, queue dispatch, origin-aware delete. Implements `OnModuleInit` to mark stale `processing` rows as errored (a restart can't finish an in-process job) |
| `extract.ts` | Format-specific text + page extraction — `pdfjs-dist` for PDF, `mammoth` for DOCX; throws typed `UnsupportedFileTypeError` / `NoExtractableTextError` |
| `ingest.ts` | LLM/vector boundary: `chunkText` (paragraph-boundary, target ~500 / max ~1000 chars), `embedChunks` (batched, 16/request → `POST {embedBaseUrl}/embeddings`), `upsertPoints` (`PUT {qdrant}/collections/documents/points`), `deletePoints`, and a shared `call()` fetch helper with labelled errors |
| `queue.ts` | A minimal in-process job queue so uploads return **201 immediately** and indexing (chunk → embed → upsert) runs in the background, reporting per-document progress that the API exposes while `status === 'processing'` |

Flow: `uploadFile(buffer, filename)` → `extractText` → on failure map to a 400 with a user-readable reason; otherwise insert a `documents` row (`status='processing'`) and enqueue `{ documentId, title, text, pageStarts }`. The worker chunks the text, embeds in batches, maps each chunk to its source page (DOCX has no reliable page mapping — those are left unanchored), and upserts points tagged with `document_id` / `title` / `page`.

### Chat pipeline — `chat/`

| File | Responsibility |
| --- | --- |
| `chat.controller.ts` | Routes: `GET/POST /chat/sessions`, `GET /chat/sessions/:id`, `POST /chat/documents` (chat-origin upload), `POST /chat/stream` (SSE) |
| `chat.service.ts` | Retrieval, prompt construction, and LLM streaming. Constants `TOP_K = 6`, `HISTORY_CAP = 6` |
| `sessions.service.ts` | SQLite-backed session + message persistence (`recentMessages`, `appendMessage`) |

Two answering modes share the streaming transport:

- **RAG (Knowledge):** `retrieve(question, documentIds?)` embeds the question, searches Qdrant for the top-6 points (`with_payload: true`; scoped by a `document_id` filter when specific documents are selected), and returns citations `{ documentId, title?, page?, score, text }`. `buildMessages` composes a system prompt that lists context as bracketed `[1] … [2] …` passages and instructs the model to cite by bracket number, falling back gracefully when no context is retrieved.
- **Direct (attached documents):** `loadDirectContext(attachments)` reads chat-origin rows directly from SQLite (no retrieval) and `buildMessagesDirect` grounds the prompt on those full texts.

`openCompletion(messages)` issues `POST {llmBaseUrl}/chat/completions` with `{ model, temperature: 0.2, max_tokens: 1024, stream: true }` (plus `top_p` only when configured), sending `Authorization: Bearer` **only** when `LLM_API_KEY` is set — so local llama.cpp/Ollama servers see no spurious header.

### Persistence — `lib/db.ts`

SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) — no native driver dependency. Schema (created idempotently, with guarded migrations for older files):

- `documents` — `id`, `title`, `status ('ready'|'processing'|'error')`, `error_reason`, `summary`, `pages`, `size_bytes`, `origin ('knowledge'|'chat')`, `content` (chat-doc text), `created_at`.
- `sessions` — `id`, `title`, `created_at`, `updated_at`.
- `messages` — `id`, `session_id`, `role ('user'|'assistant')`, `content`, `citations` (JSON), `created_at`.

### Config — `lib/env.ts`

A single frozen `config` object read once at startup from process env, with sensible local defaults (`LLM_BASE_URL → :8888/v1`, `EMBED_BASE_URL → LLM_BASE_URL`, `EMBED_MODEL → nomic-embed-text`). Keeping it in one typed module means every external boundary (Qdrant, Ollama, the chat model) is configured and documented in exactly one place.

## Streaming protocol (SSE)

`POST /api/chat/stream` sets `Content-Type: text/event-stream` + `Cache-Control: no-cache`, then writes frames of the form `data: {json}\n\n`. The event sequence is deterministic:

```
citation*   →  one per retrieved context item (RAG includes a relevance score;
              Direct mode emits one per attached document, no score)
chunk*      →  one per LLM delta: { "type":"chunk", "delta":"…" }
done | error→  terminal frame: { "type":"done" } or { "type":"error", "reason":"…" }
```

**Server side** (`chat.controller.ts`): after opening the completion, each `citation` is written first, then `readDeltas()` (an async generator in `chat.service.ts`) reads the LLM's own SSE body, splits on newlines, skips non-`data:` lines, stops at `[DONE]`, and yields `choices[0].delta.content`. Each yielded delta is relayed as a `chunk` frame while the full text accumulates for persistence. On client disconnect (`req.on('close')`) the upstream `llmRes.body` is cancelled so no tokens are generated into the void.

**Client side** (`apps/web/src/lib/api.ts`): a `fetch` streaming reader parses the byte stream on `\n\n`, strips the `data: ` prefix, `JSON.parse`s each frame, and dispatches to an `onEvent` callback. This is consumed by the `useChatStream` hook (see below).

**Error taxonomy across the boundary:**
- *Pre-stream* failures (bad request, retrieval error, LLM connection refused) → a normal **HTTP 502 JSON** `{ error }`, because no SSE stream has started yet.
- *Mid-stream* failures (upstream drops after headers are flushed) → an in-band **SSE `error` frame**, since the response is already open.

The client treats both as "show a friendly message", so the user never sees a raw stack trace regardless of where the failure landed.

## Frontend architecture (`apps/web/src`)

### Layering: presentational vs. container

- **Presentational components** (`components/`): `AppShell` (top nav + theme toggle), `Markdown` (rendered assistant output via `react-markdown` + `remark-gfm`), `StatusBadge` (upload/processing/ready/error states), `Toaster` (transient notices). Each is stateless, typed with its own `types.ts`, and carries no data-fetching.
- **Container pages** (`pages/`): `ChatPage`, `KnowledgePage`, `LibraryPage`, `DocumentDetailPage`. These own local UI state, call the hooks, and compose presentational components. They are **lazy-loaded per route** (`React.lazy` + `Suspense` in `App.tsx`) so Vite emits one chunk per view and the initial bundle ships only the shared shell + first route.
- **Hooks** (`hooks/`): `useChatStream` (SSE consumption, optimistic message append, streaming accumulation, error surfacing) and `useDocuments` (library load/upload/remove with status transitions). Shared logic lives here, not in components.

### State: single source of truth (Zustand)

Two stores under `lib/stores/`, created with the Zustand v5 curried `create<State>()((set, get) => …)` form:

- **`useDocumentsStore`** — `documents / loaded / error` plus `load` (idempotent), `refresh`, `addDocument`, `removeDocument`. Selectors `selectByOrigin(docs, origin?)` and `selectReadyKnowledge` keep the Library and Knowledge views correctly filtered by `origin` (`knowledge` vs `chat`).
- **`useSessionsStore`** — `sessions / loaded / activeId / messages` plus session lifecycle actions. One transcript is held at a time; opening a session replaces it, "New conversation" clears it.

Selectors return **stable references** (no fresh arrays per call) so `useSyncExternalStore`'s snapshot contract holds and components don't re-render on every store touch. The result: state survives route changes because it lives outside the component tree — navigating away from Chat and back preserves the conversation, and Library/Knowledge never share a stale copy of each other's documents.

### Data flow — upload (Knowledge)

```
KnowledgePage → useDocuments.upload(file)
  → POST /api/documents/upload (multipart)          [201 immediately]
  ← store.addDocument(pending doc)                   [optimistic: row appears as "processing"]
     background queue: extract → chunk → embed → upsert
  ← refresh() when the view re-attaches              [status flips to ready/error via GET /documents]
```

### Data flow — question (Chat)

```
ChatPage → useChatStream.send(question, documentIds?, attachments?)
  → append user message + empty assistant bubble     [optimistic UI: visible before any token]
  → POST /api/chat/stream (SSE)
     citation*   → attach to the in-flight answer    [inline citations appear as they arrive]
     chunk*      → append delta, re-render Markdown  [progressive streaming]
     done        → finalize; if sessionId, persist both turns server-side
     error       → surface a friendly message on the bubble
```

## End-to-end error handling

1. **Upload:** unsupported type / no extractable text → typed API errors → 400 with a human-readable reason → `StatusBadge` flips to `error` and a `Toaster` notice appears; oversized files are rejected against `MAX_UPLOAD_MB`.
2. **Retrieval/indexing:** a failed embed or Qdrant upsert marks the document row `error` (recovered on next restart by `OnModuleInit`), never crashing the process.
3. **Chat, pre-stream:** any failure before headers flush → HTTP 502 JSON → client shows a friendly message.
4. **Chat, mid-stream:** upstream drop after flushing → SSE `error` frame → the in-flight bubble updates in place; the accumulated partial text is preserved so nothing is lost.
5. **Client:** every network path funnels through one error surface (Toaster + inline bubble), and client aborts cancel the upstream LLM body server-side.

## Performance & quality notes

- **Code-splitting** per route (see above) keeps the initial payload to shell + first view.
- **Batched embeddings** (16/request) bound Qdrant/Ollama round-trips during indexing.
- **Typed boundaries everywhere** — API DTOs, web `types.ts`, and shared `api.ts` contracts are all explicit TypeScript; there is no `any` in the request/response surface.
- **Lint/format gates** (ESLint flat config + Prettier) plus per-app **Vitest coverage floors** keep the diff honest (see [TESTING.md](TESTING.md)).
