# PRD — api/_root (bootstrap & module graph)

## Problem / baseline
The API needs a single entrypoint that starts a Nest application with the global `/api` prefix and composes the domain modules.

## Outcome
`node dist/main.js` boots a service on port 3001 exposing only `/api/*` routes.

## Scope
- In: bootstrap (env-driven port), global prefix, module graph (DocumentsModule + ChatModule).
- In (M5): dependency manifest for file upload (`multer`, `@types/multer`, `pdfjs-dist`, `mammoth`, `@types/mammoth`); `start` script loads `.env` via Node 24 built-in loader (`node --env-file=.env dist/main.js` — no dotenv); real `.env` (gitignored) + refreshed `.env.example` carrying the full ENV contract from the master plan.
- Out of scope: domain behavior (sibling packages), Swagger/OpenAPI (excluded by design).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-ROOT-1 | `npm run build -w doc-api` emits a `dist/main.js` runnable with plain Node. |
| API-ROOT-2 | Server listens on port from `PORT` env (default 3001). |
| API-ROOT-3 | All routes under the `/api` prefix; non-prefixed paths return 404. |
| API-ROOT-4 | AppModule imports exactly DocumentsModule + ChatModule. |
| API-ROOT-5 (M5) | `npm run start -w doc-api` picks up `.env` without dotenv (Node 24 `--env-file`); `.env.example` documents every key in the master-plan ENV contract with defaults and provider examples (Ollama / llama.cpp / cloud). See API-M5-8. |

## Assumptions / questions
None outstanding. M5 env-loading uses Node's built-in loader; if a future toolchain drops below Node 24, revisit (dotenv fallback).
