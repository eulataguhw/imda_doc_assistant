# Change Record — m1-scaffold (authoritative)

- **Goal:** M1 scaffold of the Doc Assistant monorepo — compilable skeleton + honest stubs, SSE contract testable.
- **Status:** complete + verified (2026-10-22).
- **Approval scope:** user standing instruction — proceed with plan creation, then project scaffolding, and pause there. No commits/pushes made.

## Before → after
Empty directory → npm-workspaces monorepo: NestJS API (documents + chat/SSE), React SPA shell (Library/Chat), Tailwind v4 tokens, SQLite `documents` DDL, full docs/spec tree.

## Deliverables (all create)
| Path | Reason |
| --- | --- |
| `package.json`, `package-lock.json`, `README.md`, `.gitignore`, `data/.gitkeep` | Workspace root, scripts, repo docs |
| `docs/**` (project docs + spec index + this record) | Governing docs per user instruction |
| `apps/api/package.json`, `tsconfig.json`, `.env.example` | API manifest/config |
| `apps/api/src/main.ts`, `app.module.ts` | Bootstrap, `/api` prefix, module graph |
| `apps/api/src/lib/env.ts`, `lib/db.ts` | Typed config; SQLite documents table |
| `apps/api/src/documents/*` (module/controller/service) | `GET /api/documents` |
| `apps/api/src/chat/*` (module/controller) | `POST /api/chat/stream` SSE contract |
| `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Web manifest/config/entry |
| `apps/web/src/main.tsx`, `App.tsx` | Providers, shell, routes |
| `apps/web/src/pages/LibraryPage.tsx`, `ChatPage.tsx` | View stubs (M2/M3) |
| `apps/web/src/styles/globals.css` | Tailwind + oklch tokens |

## Verification evidence (live, 2026-10-22)
- `npm install --no-audit --no-fund` → exit 0, 160 packages.
- `npm run build` → exit 0; API dist = 9 JS files; web `index-BdU_Nz6d.js` 264.60 kB (gzip 84.57) + CSS 6.08 kB (gzip 2.03).
- `GET /api/documents` → `[]`.
- `POST /api/chat/stream` with `{"question":"what is this?","documentIds":["doc-abc"]}` → frames: `{"type":"citation","documentId":"doc-abc"}` · `{"type":"chunk","delta":"This is a stub answer. "}` · `{"type":"chunk","delta":"M3 streams real LLM tokens. "}` · `{"type":"done"}`.
- Malformed body `{"nope":1}` → HTTP 400 + JSON error.
- Nest boot log: routes `{/api/documents, GET}`, `{/api/chat/stream, POST}` mapped; application started successfully.

## Versions (registry-latest at pin time)
TypeScript 7.0.2 · @nestjs/* 12.2.0 · rxjs 7.8.2 · react(-dom) 19.3.1 · react-router 8.5.0 · vite 8.3.5 · tailwindcss 4.3.3 · next-themes 0.4.6 · zustand 5.0.15 · @types/node 26.6.5.

## Next action
M2 (ingestion/upload) — pending user approval; spec the `documents`, `lib` (API) and `pages` (web) packages first.
