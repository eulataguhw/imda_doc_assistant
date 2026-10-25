# SNAPSHOT m8-chat-experience — milestone complete

META

- date: 2026-10-26
- version: uncommitted (working tree; M4+M5+M6+M7+M8 pending one combined commit on approval)
- author: lead (orchestrator + developer; Groq/Cerebras subagent routes were down, work executed locally under the same plan)
- related: [m8-chat-experience (authoritative record)](../../spec/_cross-cutting/m8-chat-experience.md) · [working-memory](../working-memory.md)

STATE

- architecture: monorepo — `apps/api` (NestJS 12, :3001, node:sqlite) + `apps/web` (React 19 SPA, Vite, dev proxy :5173→:3001).
- backends: [Ollama :11434 (nomic-embed-text embeddings), Qdrant :6333 (collection `documents`), llama.cpp :8888 (`Qwen3.8-27B-Uncensored`)]
- primary_flow: chat → `POST /api/chat/stream` → direct mode (attached docs' full text) or RAG (top-k Qdrant) → flat SSE `citation*→chunk*→done|error` → client maps to nested + renders markdown with inline citation chips.
- secondary_flow: document lifecycle — Knowledge (RAG, uploadable) vs Library (chat-only) lists; per-doc delete (knowledge also removes Qdrant points); server-backed session history (new/revisit).

COMPONENTS

- api-chat: role=orchestration · in=`{sessionId?, attachments?, message}` · out=SSE stream + persisted user/assistant messages · deps=[documents, qdrant, llama.cpp]
- api-documents: role=catalog+ingest · in=multipart upload / origin filter / delete · out=201/204/404 · deps=[qdrant (points), node:sqlite]
- web-chat-flagship: role=presentation · markdown via react-markdown+remark-gfm, `[n]`→chip→`/documents/:id`, scoped picker, composer dropzone, new/revisit history
- web-pages: Knowledge (renamed Library, keeps upload) + Library (chat-only, no upload) + AppShell nav

CHANGES (M8)

- added: [`documents.origin`+`content` columns, `sessions`/`messages` tables], [`POST /chat/documents`, `GET/POST /chat/sessions[/:id]`, `DELETE /documents/:id` (+Qdrant points)], [ChatPage history/markdown/citations/dropzone, KnowledgePage, LibraryPage, Markdown.tsx, lib/markdown.ts], [API vitest (18), web vitest (20), Playwright E2E (5)]
- modified: [`documents.service/controller`, `chat.service/controller`, `db.ts` migration, `ingest.deletePoints`, `lib/api.ts`, `App.tsx`, `AppShell.tsx`]
- breaking: none (additive schema; SSE contract preserved flat)

CHECKS / EVIDENCE (2026-10-26)

- root build exit 0 · API vitest 18/18 · web vitest 20/20 · Playwright E2E 5/5 (26.2s) vs live stack at :5173→:3001
- route fix verified: web session calls `/api/sessions`→`/api/chat/sessions`; live proxy `curl :5173/api/chat/sessions` → `[]`

RISKS / OPEN ITEMS

- Web views verified by code + built bundle + proxy round-trips + Playwright; final live click-through (both themes) left to the user.
- API DB path is cwd-relative (`../../data/doc-assistant.db`) — boot from `apps/api/`.
- Qwen3.8-27B streams `reasoning_content` before `content`; keep `LLM_MAX_TOKENS` ≥ 1024.
- No commits yet — M4+M5+M6+M7+M8 all uncommitted; approval required.

NEXT

- User live click-through of http://localhost:5173 (Chat attach→cited answer / RAG / new+revisit, Knowledge upload+delete, Library chat-only list+remove) — both themes.
- Commit M4+M5+M6+M7+M8 on explicit user approval only (one combined commit recommended).
- Any new milestone starts from this boundary.
