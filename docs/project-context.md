# Project Context — Doc Assistant

## What it is

An AI-powered document assistant. Users upload PDFs, ask questions in a chat view, and receive answers streamed token-by-token (Server-Sent Events) with citations pointing to source documents and page numbers. The UI is a two-page SPA: **Library** (document collection + upload) and **Chat** (questions, streamed answers, citation chips).

## Grade

Demo-grade but production-clean: real endpoints, real persistence, honest stubs where a milestone has not landed yet — no fake data presented as live.

## Verified stack (npm registry checked 2026-10-22)

| Layer          | Choice                                 | Version                                  |
| -------------- | -------------------------------------- | ---------------------------------------- |
| Runtime        | Node.js                                | v24.19.0                                 |
| Language       | TypeScript (native compiler)           | 7.0.2 (both apps)                        |
| API            | NestJS (common/core/platform-express)  | 12.2.0 — port 3001, global `/api` prefix |
| Web            | React + react-dom                      | 19.3.1                                   |
| Build/serve    | Vite + @vitejs/plugin-react            | 8.3.5 / 6.1.2                            |
| Styling        | Tailwind CSS v4 (+ @tailwindcss/vite)  | 4.3.3 — oklch tokens, `.dark` class      |
| Routing        | react-router (client-side SPA)         | 8.5.0                                    |
| Theming        | next-themes (`attribute="class"`)      | 0.4.6                                    |
| State          | zustand                                | 5.0.15                                   |
| Metadata store | SQLite via built-in `node:sqlite`      | Node 24 built-in                         |
| Vector store   | Qdrant (stub in M1)                    | default `http://localhost:6333`          |
| LLM            | OpenAI-compatible API (default Ollama) | `qwen2.5:7b-instruct-q4_K_M`             |

## Deliberate choices

- **`node:sqlite` over better-sqlite3** — same SQLite file contract (`data/doc-assistant.db`), no native compilation; latest better-sqlite3 (13.0.3) is the fallback if built-in limits are hit.
- **No Swagger/OpenAPI** — the SSE + REST surface is small and documented in the spec packages instead.

## Layout

npm workspaces: `apps/api` (NestJS service), `apps/web` (React SPA), `data/` (SQLite file, gitignored). Each app's specs mirror its `src/` under `<app>/docs/spec/`; project-level docs live in `docs/`.

## Constraints

- SSE frame contract is fixed and testable — see spec index → API `chat` package.
- No commits/pushes/merges without explicit user approval per action.
