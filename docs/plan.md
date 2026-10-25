# AI-Powered Document Assistant — Final Plan (v3)

**Canonical master plan.** This document is the main plan we always refer to and update. Per-system plans/specs live in `apps/*/docs/spec/` and are more granular; when they conflict, this file sets intent and the cross-cutting records under `spec/_cross-cutting/` set evidence.

## Goal
A polished, eval-ready document Q&A app per the brief's weights: UI/UX polish 40% · frontend architecture 25% · streaming & citations 20% · testing 10% · DevOps 5%.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite + React SPA, React Router (multi-page within one SPA), TypeScript strict — no implicit any |
| Client state | Zustand stores (chatStore: sessions/messages/stream buffer; libraryStore: documents/status); theme via next-themes, persisted |
| Design layer | Tailwind v4 CSS-first tokens (@theme palette/typography/spacing) + shadcn/ui primitives; light/dark + reduced-motion support |
| Backend | NestJS API service (thin layer). One language with the frontend keeps it lean; FastAPI swap only affects backend milestones. Exposes: GET/POST /documents, DELETE /documents/:id, POST /chat/stream (SSE) |
| RAG | Ingestion → per-page chunking → embeddings via OpenAI-compatible endpoint (env-configurable: OpenAI cloud or local Ollama/vLLM) → Qdrant vectors with documentId/page/section payload; retrieval returns scored chunks injected into the chat prompt as context |
| Persistence | SQLite for sessions, document metadata, chunk registry (data.db, volume-mounted). Node 24 built-in `node:sqlite` — no native build step |
| Streaming | SSE from API → client ReadableStream consumption; token-level rendering + live typing cursor; done/error events |
| Docs/devops (final milestone) | Dockerfile, docker-compose (api + qdrant services), GitHub Actions (lint/typecheck/test), .env.example, README/ARCHITECTURE/DESIGN/TESTING docs written last to reflect real state |

## Milestones

| v3 milestone | Scope | Status (as of 2026-10-25) |
| --- | --- | --- |
| **M1 — Scaffolding** | Workspace layout, Vite React app shell (Chat + Library pages), design tokens & theme wiring, NestJS service with document/chat module skeletons returning stub responses. Build must pass: `npm run build` in both apps. | **Done** (root M1, 2026-10-22) — builds verified both apps. |
| **M2 — Ingestion & library** | Real upload flow (drag-drop + click), file-type/size guards, per-file status lifecycle (uploading → processing → ready/error), extraction preserving page boundaries. | **Done (2026-10-25)** — root M4 delivered the pipeline core (JSON text upload, chunk→embed→Qdrant, lifecycle, error reasons, web control); root **M5** completed it: file drag-drop/multi-file upload, type+size guards with per-file rejection toasts, async indexing with visible progress. Verified live (evidence in `spec/_cross-cutting/m5-file-upload.md`). |
| **M3 — RAG & streaming chat** | Chunk→embed→Qdrant upsert pipeline; SSE proxy of chat-completions with retrieved-context prompt assembly; citation events resolved from vector payloads. | **Done (2026-10-25)** — root M6 delivered real RAG: Qdrant top-k retrieval (global or scoped to selected docs), context-grounded prompt with ≤6-message history, streaming LLM over the frozen SSE contract, ChatPage consuming it (fakes deleted); plus LLM document summary + real pages/size at ingest. Verified live (evidence in `spec/_cross-cutting/m6-rag-chat.md`). |
| **M4 — Polish & a11y** | Empty/skeleton/error states, micro-interactions, WCAG 2.1 AA (focus management, contrast ≥ 4.5:1, keyboard-only flow). | **Done (2026-10-25)** — root M7 delivered: Library skeleton + `role="alert"` error w/ Retry, Chat `aria-live` streaming region, theme-aware `--focus-ring` + global `:focus-visible`, `prefers-reduced-motion` guard, and a contrast pass (dark `--accent` raise, `--badge-solid-text`, `--text-secondary` replacing the AA-failing `foreground`+opacity muted-text idiom). Web build exit 0; tokens/rules confirmed in bundle (evidence in `spec/_cross-cutting/m7-polish-a11y.md`). |
| **M5 — Bonus set** | Two-locale i18n scaffold, citation-click → in-app viewer with highlighted cited passage, Lighthouse ≥ 90 target checks. | Pending. |
| **M6 — DevOps & documentation** | Docker/compose/CI/four docs. | Partial: local docker-compose services (qdrant, ollama) running ad hoc; formalized compose + CI in this milestone. |

## Numbering map (avoid confusion)
Root `docs/development-plan.md` tracks **root milestone batches** (M1–M5…); v3 milestones above are the product plan. Mapping of completed work:

| Root batch | Delivered | v3 coverage |
| --- | --- | --- |
| M1 (2026-10-22) | Scaffolding, root docs pattern | v3-M1 |
| M2 (2026-10-23) | Status metadata layer, qdrant config, css tokens | v3-M4 (partial: status/token groundwork) |
| M3 (2026-10-24) | Library/detail views + badges, chat SSE contract | v3-M3 (contract), v3-M4 (partial) |
| M4 (2026-10-25) | Text ingestion pipeline + upload control | v3-M2 (core pipeline) |
| M5 (2026-10-25) | File drag-drop/multi-file upload, guards, async indexing w/ progress, provider-agnostic `.env` | completes v3-M2 |
| M6 (2026-10-25) | Real RAG chat (retrieval + streaming LLM over frozen SSE contract) + LLM doc summary & real metadata at ingest | completes v3-M3 |
| **M7 (current, 2026-10-25)** | Polish & a11y: empty/skeleton/error states, micro-interactions, WCAG 2.1 AA (focus ring, reduced motion, contrast pass) | **completes v3-M4** |

## ENV contract (live config surface)
All LLM access goes through `apps/api/src/lib/env.ts`; **no provider is hardcoded**. The API reads its environment from `apps/api/.env` (gitignored), loaded by Node 24's built-in `--env-file` loader (no dotenv dependency). Switching Ollama → llama.cpp (`llama-server`) → any OpenAI-compatible cloud endpoint is a **config-only change** — the request shapes are already standard OpenAI-compatible.

| Key | Meaning | Ollama | llama.cpp | Cloud |
| --- | --- | --- | --- | --- |
| `LLM_BASE_URL` | OpenAI-compatible root for chat (default `http://localhost:11434/v1`) | `http://localhost:11434/v1` | `http://host:8080/v1` | `https://api.openai.com/v1` |
| `LLM_MODEL` | Chat model id (default `qwen2.5:7b-instruct-q4_K_M`) | `qwen2.5:7b-instruct-q4_K_M` | served GGUF name | `gpt-4o-mini` |
| `EMBED_BASE_URL` | Embeddings root; **defaults to `LLM_BASE_URL`** when unset (embeddings may run on a different box/provider than chat) | — | `http://embed-box:8080/v1` | `https://api.openai.com/v1` |
| `EMBED_MODEL` | Embedding model id (default `nomic-embed-text`) | `nomic-embed-text` | embedding GGUF name | `text-embedding-3-small` |
| `LLM_API_KEY` | Optional; when set, `Authorization: Bearer …` is sent on every LLM call (Ollama/llama.cpp ignore it) | — | — | `sk-…` |
| `LLM_TEMPERATURE` | Sampling temperature for chat + summary generation (default `0.2`) | `0.2` | `0.2` | `0.2` |
| `LLM_TOP_P` | Optional; when unset, `top_p` is omitted from requests entirely (API-M6-2) | — | `0.9` | `0.9` |
| `LLM_MAX_TOKENS` | Max completion tokens for chat + summary generation (default `1024`) | `1024` | `1024` | `1024` |
| `QDRANT_BASE_URL` | Qdrant REST root (default `http://localhost:6333`) | `http://localhost:6333` | same | same |
| `MAX_UPLOAD_MB` | Upload size cap in MB (default `10`) | `10` | `10` | `50` |
| `PORT` | API port (default `3001`) | unchanged | unchanged | unchanged |
| `DATABASE_PATH` | SQLite file path (default `../../data/doc-assistant.db`) | unchanged | unchanged | unchanged |

**Rule:** any change to env keys must land in **all three** of `apps/api/src/lib/env.ts`, `apps/api/.env.example`, and the ENV contract section above, in the same change. This is an acceptance criterion (API-M5-8), not a suggestion.

## Assumptions
Node 24 toolchain (installed); Qdrant available via compose; LLM/embedding endpoints reachable at demo time (stub mode in CI). `doc-assistant/` is a fresh git repo under `/mnt/Inference/AI/Projects`; existing react-scaffold kept as reference only.
