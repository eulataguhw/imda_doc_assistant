# Doc Assistant

An AI-powered document assistant: upload PDFs and documents, ask questions in natural language, and receive **accurate, cited answers streamed token-by-token** — with every answer grounded in your own documents via Retrieval-Augmented Generation (RAG).

Built as a local-first full-stack application: a React 19 Single Page Application frontend, a lightweight NestJS API, and a provider-agnostic LLM layer that connects to Ollama, llama.cpp, or any OpenAI-compatible cloud endpoint.

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                        Browser Client (React 19 SPA)                    |
|  [AppShell] -> [KnowledgePage | LibraryPage | ChatPage | DocumentDetailPage] |
|  Client State: Zustand (documents + sessions)  | Streaming: ReadableStream |
+-------------------------------------------------------------------------+
                                     |
               REST API calls        |       SSE Token Stream
         (Upload, Delete, List)      |    (citation* -> chunk* -> done)
                                     v
+-------------------------------------------------------------------------+
|                         NestJS API Layer (:3001)                        |
|   /api/documents (Upload/Delete)           /api/chat/stream (SSE)       |
|   /api/chat/sessions (History)             /api/health (Liveness)       |
+-------------------------------------------------------------------------+
         |                       |                       |
         v                       v                       v
+-----------------+    +-------------------+    +-------------------------+
|  SQLite Storage |    | Qdrant Vector DB  |    | LLM & Embeddings Engine |
|  (node:sqlite)  |    |     (:6333)       |    | Ollama / llama.cpp /    |
| documents,      |    | embeddings & top-k|    | OpenAI-compatible API   |
| sessions, turns |    | cosine retrieval  |    | stream: true deltas     |
+-----------------+    +-------------------+    +-------------------------+
```

### Core Ingestion & Answering Flows

1. **Document Ingestion (Knowledge):** Upload file (`.pdf`, `.docx`) → text extraction (`pdfjs-dist` / `mammoth`) → paragraph chunking (~500 chars) → batched embeddings via Ollama → Qdrant vector indexing with metadata (`document_id`, `page`, `title`).
2. **Conversational Answering (Chat):** Submit question → embed question (`nomic-embed-text`) → top-k semantic search in Qdrant (global across "All documents" or scoped to a selected document) → assemble context-grounded prompt with bracketed `[1]...[6]` references → stream completion via SSE (`citation` events delivered first with document title and page numbers, then progressive `chunk` deltas with live cursor, ending with `done`). When direct files are attached in chat, the scope selector automatically switches to "current documents" and scopes answers to the attached content. Selecting **"Ask about this"** from Knowledge starts a fresh session scoped to that document.

---

## Design Decisions

- **Component Library Choice:** Custom lightweight accessible primitives styled with **Tailwind CSS v4** and **oklch design tokens** rather than heavy third-party UI kits (e.g. MUI or AntD). This provides full control over WCAG 2.1 AA accessibility (focus rings, ARIA live regions, skip links), zero bundle bloat, and instantaneous light/dark theme switching.
- **State Management Approach:** Curried **Zustand v5 stores** (`useDocumentsStore`, `useSessionsStore`) kept outside the React component tree. Selectors return stable references to eliminate unnecessary re-renders. This ensures state **survives route navigation** (e.g., inspecting a document on `DocumentDetailPage` and returning to `ChatPage` preserves in-flight streams and transcripts), while intentional actions like "Ask about this" cleanly reset into fresh conversations.
- **Streaming Strategy:** A single, deterministic **Server-Sent Events (SSE)** channel over `POST /api/chat/stream`. Citations with page numbers are delivered before generation begins so grounding is transparent and source chips render immediately. Token chunks render progressively with a live typing cursor. Client disconnects automatically abort upstream generation to conserve resources.

---

## Quick Start (Runnable in under 10 minutes)

**Prerequisites:** Node.js **22+** (uses built-in `node:sqlite`).

### Option A: Docker Compose (All-in-one Local Stack)

Brings up Ollama (embeddings + chat), Qdrant vector database, the NestJS API, and the Web UI in a single command:

```bash
docker compose up --build
```

- Open **http://localhost:8080** (Nginx serves the SPA and proxies `/api` to the backend).
- Optional: Pull a chat model into Ollama once if running fully offline:
  ```bash
  docker compose exec ollama ollama pull qwen2.5:7b-instruct-q4_K_M
  ```

### Option B: Local Development Stack (Hot Reload)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

3. **Start backing services** (Ollama on `:11434` and Qdrant on `:6333`):

   ```bash
   ollama serve
   docker run -p 6333:6333 -v ./data/qdrant:/qdrant/storage qdrant/qdrant
   ```

4. **Build and launch dev servers:**
   ```bash
   npm run build
   npm run dev:api    # Terminal 1: NestJS API on http://localhost:3001
   npm run dev:web    # Terminal 2: Vite SPA on http://localhost:5173
   ```
   Open **http://localhost:5173**. Liveness probe is available at `GET http://localhost:3001/api/health`.

---

## Offline Testing & Mock Mode

To evaluate and test the application locally without running local LLM daemons or external API keys:

1. **Deterministic Unit & Component Tests:**
   The entire test suite is 100% mocked and decoupled from external services:
   ```bash
   npm test
   ```
2. **Offline API Mock Mode:**
   You can point `LLM_BASE_URL` in `apps/api/.env` to any lightweight mock server or OpenAI-compatible endpoint (e.g., local mock server returning streaming chunks). If the LLM is unreachable, the API returns graceful HTTP 502 / SSE error events that the frontend handles cleanly without crashing.

---

## Running the Test Suite

```bash
# Run unit & component tests across all workspaces
npm test

# Run tests with coverage gates (enforces >= 80% on all metrics)
npm run test:coverage -w doc-web
npm run test:coverage -w doc-api

# Run Playwright end-to-end integration tests
npm run test:e2e

# Run linter & code formatting checks
npm run lint
npm run format:check
```

See [TESTING.md](TESTING.md) for full test architecture, component coverage matrix, and `jest-axe` accessibility audit logs.

---

## Configuration Reference

All backend configuration is loaded from `apps/api/.env` via Node's `--env-file` loader:

| Variable          | Description                                      | Default                      |
| :---------------- | :----------------------------------------------- | :--------------------------- |
| `PORT`            | API listen port                                  | `3001`                       |
| `DATABASE_PATH`   | SQLite database file location                    | `data/doc-assistant.db`      |
| `LLM_BASE_URL`    | OpenAI-compatible chat endpoint                  | `http://localhost:11434/v1`  |
| `LLM_MODEL`       | Model identifier                                 | `qwen2.5:7b-instruct-q4_K_M` |
| `LLM_API_KEY`     | Bearer token (optional, omitted when unset)      | _(empty)_                    |
| `EMBED_BASE_URL`  | Embeddings endpoint (defaults to `LLM_BASE_URL`) | `http://localhost:11434/v1`  |
| `EMBED_MODEL`     | Embedding model identifier                       | `nomic-embed-text`           |
| `QDRANT_BASE_URL` | Qdrant vector database endpoint                  | `http://localhost:6333`      |
| `MAX_UPLOAD_MB`   | Maximum allowed upload size in megabytes         | `10`                         |

---

## Known Limitations & Future Improvements

1. **In-Browser PDF Passage Highlight:** Citations currently link to the document's detail view ([`DocumentDetailPage`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/pages/DocumentDetailPage/DocumentDetailPage.tsx)); direct in-canvas PDF highlighting and auto-scrolling to the cited snippet is a bonus feature planned for next release.
2. **Runtime Model Selection UI:** The active chat model is managed via `LLM_MODEL` configuration. Adding a dynamic model selector dropdown in the chat header is architected and ready for UI binding.
3. **Plain-Text File Extension Ingestion:** Current extraction targets `.pdf` and `.docx`; `.txt` and `.md` file ingestion will be enabled in Phase 2.

---

## Documentation Index

- **[ARCHITECTURE.md](ARCHITECTURE.md):** Frontend component tree, data-flow sequence diagrams, REST & SSE API contracts, and Zustand state design.
- **[DESIGN.md](DESIGN.md):** Design system specifications: oklch tokens, typography scale, spacing grid, component variants, and accessibility decisions.
- **[TESTING.md](TESTING.md):** Testing strategy, component coverage breakdown, `jest-axe` audit results, and snapshot tests.
- **[INNOVATION_ASSESSMENT.md](INNOVATION_ASSESSMENT.md):** Section 2 essay addressing the 8 knowledge-worker innovation dimensions.
- **[DEMO.md](DEMO.md):** Structured 20-minute live demonstration script and evaluator interview defense guide.
