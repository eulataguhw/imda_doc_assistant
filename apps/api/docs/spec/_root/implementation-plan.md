# Implementation Plan — api/_root

## Design delta (M1)
`NestFactory.create(AppModule)` → `setGlobalPrefix("api")` → `listen(config.port)` (env `PORT`, default 3001). AppModule imports exactly DocumentsModule + ChatModule.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/main.ts` | create | Entry: bootstrap sequence above |
| `apps/api/src/app.module.ts` | create | Module graph |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| API-ROOT-1 | workspace build script | build exit 0; `dist/main.js` exists |
| API-ROOT-2 | `listen(config.port)` | boot log shows port 3001 |
| API-ROOT-3 | `setGlobalPrefix("api")` | Nest log maps routes under `/api/*` |
| API-ROOT-4 | AppModule imports | both controllers' routes present in boot log |

## Commands
    npm run build -w doc-api   # tsc → dist/
    npm run start -w doc-api   # node dist/main.js

## Deviations
None.
