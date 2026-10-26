# Implementation Plan — api/_root

## Design delta (M1)

`NestFactory.create(AppModule)` → `setGlobalPrefix("api")` → `listen(config.port)` (env `PORT`, default 3001). AppModule imports exactly DocumentsModule + ChatModule.

## File operations (M1, all create)

| Path                         | Op     | Reason                          |
| ---------------------------- | ------ | ------------------------------- |
| `apps/api/src/main.ts`       | create | Entry: bootstrap sequence above |
| `apps/api/src/app.module.ts` | create | Module graph                    |

## Requirement → step mapping

| Req (PRD)  | Step                     | Check                                        |
| ---------- | ------------------------ | -------------------------------------------- |
| API-ROOT-1 | workspace build script   | build exit 0; `dist/main.js` exists          |
| API-ROOT-2 | `listen(config.port)`    | boot log shows port 3001                     |
| API-ROOT-3 | `setGlobalPrefix("api")` | Nest log maps routes under `/api/*`          |
| API-ROOT-4 | AppModule imports        | both controllers' routes present in boot log |

## Commands

    npm run build -w doc-api   # tsc → dist/
    npm run start -w doc-api   # node dist/main.js

## Deviations

None.

---

## M5 — deps manifest + env loading (spec gate 2026-10-25)

### Design delta

- `package.json`: add `multer`, `@types/multer` (dev), `pdfjs-dist`, `mammoth`, `@types/mammoth` (dev). `start` script → `node --env-file=.env dist/main.js` (Node 24 built-in env loader — no dotenv dependency; `.env` is gitignored, created from the refreshed example).
- `.env.example`: full ENV contract per [master plan](../../../../../../docs/plan.md) with defaults + commented Ollama / llama.cpp / cloud examples.

### File operations (M5)

| Path                    | Op     | Reason                                 |
| ----------------------- | ------ | -------------------------------------- |
| `apps/api/package.json` | modify | upload deps; `--env-file` start script |
| `apps/api/.env.example` | modify | full ENV contract + provider examples  |
| `apps/api/.env`         | create | local values (gitignored)              |

### Requirement → step mapping (M5)

| Req        | Step                           | Check                                                                                                                        |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| API-ROOT-5 | start script + example refresh | `npm run start -w doc-api` boots with `.env` loaded (log/port proof); key parity across env.ts / .env.example / docs/plan.md |

## Deviations (M5)

None.
