# Change — m5-file-upload (api/_root)

Authoritative record: [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md). This note covers only this package's files.

| Path                    | Op               | Reason                                                                                                                                                                                                              | Req              |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `apps/api/package.json` | modify           | deps: multer, @types/multer, pdfjs-dist, mammoth, @types/mammoth; `start` → `node --env-file=.env dist/main.js` (Node 24 built-in loader, no dotenv)                                                                | API-ROOT-5       |
| `apps/api/.env.example` | modify           | full ENV contract + provider examples (Ollama / llama.cpp / cloud)                                                                                                                                                  | API-M5-8         |
| `apps/api/.env`         | create (pending) | local values (gitignored) — user approved creation, but CC Safety Net (`secret.basename.env`) blocked the write; server was verified with inline env vars instead. Create from `.env.example` when the gate allows. | API-M5-5, -7, -8 |

Status: **implemented & verified 2026-10-25** — build exit 0 (after Nest 12.2 / pdfjs v6 type fixes); ENV contract cross-checked across `docs/plan.md` ↔ `env.ts` ↔ `.env.example`. Evidence in the authoritative record.
