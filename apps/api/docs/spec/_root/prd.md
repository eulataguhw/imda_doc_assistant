# PRD — api/_root (bootstrap & module graph)

## Problem / baseline
The API needs a single entrypoint that starts a Nest application with the global `/api` prefix and composes the domain modules.

## Outcome
`node dist/main.js` boots a service on port 3001 exposing only `/api/*` routes.

## Scope
- In: bootstrap (env-driven port), global prefix, module graph (DocumentsModule + ChatModule).
- Out of scope: domain behavior (sibling packages), Swagger/OpenAPI (excluded by design).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-ROOT-1 | `npm run build -w doc-api` emits a `dist/main.js` runnable with plain Node. |
| API-ROOT-2 | Server listens on port from `PORT` env (default 3001). |
| API-ROOT-3 | All routes under the `/api` prefix; non-prefixed paths return 404. |
| API-ROOT-4 | AppModule imports exactly DocumentsModule + ChatModule.

## Assumptions / questions
None outstanding.
