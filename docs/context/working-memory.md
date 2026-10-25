# Working Memory — Doc Assistant

- **Updated:** 2026-10-25
- **Goal:** M4 ingestion/upload — `POST /api/documents` (JSON `{title, content}`) → chunk → Ollama embed → Qdrant upsert, status lifecycle + error reasons, web upload control. Running autonomously per user instruction; no commits without approval.

## Current state
- Monorepo at `doc-assistant/`: `apps/api` (NestJS, builds & serves on :3001) + `apps/web` (React SPA, builds) + `data/`.
- **M3 verified headlessly:** API `GET /api/documents` returns 3 seeded docs (ready/processing/error); web build exit 0; emitted CSS has `--ready/--processing/--error` in both `:root` + `.dark`; SPA :5173 → HTTP 200 and `/api/documents` proxy hop returns all 3 statuses.
- **M4 implemented + verified live (2026-10-25):** all acceptance criteria exercised against running `doc-qdrant` + `doc-ollama`. Happy path → 201 `ready`, Qdrant point payload matches spec; Ollama-down → `error` + labeled reason `"Embedding request failed: fetch failed"`; missing title/whitespace content → 400; seed rows cleared; web round-trip through Vite proxy :5173 → 201 `ready` + Qdrant point. Evidence in all four change records (`docs/spec/_cross-cutting/m4-ingestion.md` authoritative). **Not committed** (approval policy: ask).
- **One step not done:** pixel-level visual confirmation of badge colors — requires opening http://localhost:5173 in a browser (no browser/screenshot tool in this environment).

## Decisions (this session)
| Decision | Rationale |
| --- | --- |
| Status tokens as CSS custom props + inline `style` var refs | Theme-agnostic; works without any Tailwind theme-config change |
| Named page exports (`export function LibraryPage`) | Matches `App.tsx` named imports + existing `ChatPage` convention; default export broke the build |
| Shared client `lib/api.ts` with typed `Document` union | Centralizes fetch; keeps the status enum in one place per app |
| Typed row mapping for `.all()` (not direct cast) | node:sqlite returns `Record<string, SQLOutputValue>[]`; direct DTO cast fails tsc (TS2352) |
| Dev-only idempotent seed (fixed ids, COUNT guard) | Lets the UI be verified against every badge state before real uploads exist |

## Assumptions
- Qdrant + Ollama available locally when M4 starts (URLs are env-configured).
- User approves M4 scope before implementation starts.
- Status enum `"ready" | "processing" | "error"` is authoritative across `documents.service.ts`, `lib/api.ts`, `StatusBadge.tsx`, and the DB `CHECK` constraint — keep in sync.

## Risks / open items
- Web views are build + headless-pipeline verified only; no interactive browser pass yet (M1–M4 all share this gap).
- API DB path is cwd-relative (`../../data/doc-assistant.db`) — always run the server with cwd `apps/api`, never repo root.
- Qdrant 1.20.0 REST surface: collection-create + points-upsert are now **PUT** (not POST); both fixed in `ingest.ts` and verified live.

## Next action
M4 milestone boundary reached — report delivered. Remaining: commit/push on explicit user approval; candidate M5 = PDF/multipart ingest or async job queue (per `ingest.ts` PONYTAIL marker).

## Links
[Docs index](../README.md) · [Development plan](../development-plan.md) · [M3 change record](../spec/_cross-cutting/m3-status-badges.md) · [Spec index](../spec/README.md)
