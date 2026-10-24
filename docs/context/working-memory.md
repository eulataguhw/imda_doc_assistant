# Working Memory — Doc Assistant

- **Updated:** 2026-10-24
- **Goal:** M3 complete and verified (library list/detail + status badges + semantic palette); paused at the milestone boundary awaiting user approval for M4 (ingestion/upload).

## Current state
- Monorepo at `doc-assistant/`: `apps/api` (NestJS, builds & serves on :3001) + `apps/web` (React SPA, builds) + `data/`.
- **M3 verified headlessly:** API `GET /api/documents` returns 3 seeded docs (ready/processing/error); web build exit 0; emitted CSS has `--ready/--processing/--error` in both `:root` + `.dark`; emitted JS has badge var refs + `` fetch(`${BASE}/documents`) ``; SPA :5173 → HTTP 200 and `/api/documents` proxy hop returns all 3 statuses.
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
- Web views are build + headless-pipeline verified only; no interactive browser pass yet (M1, M2, M3 all share this gap).
- API DB path is cwd-relative (`../../data/doc-assistant.db`) — always run the server with cwd `apps/api`, never repo root.
- Seed rows are dev-only samples; must be dropped when M4 writes real rows (PONYTAIL marker in `db.ts`).

## Next action
Await user approval → spec M4 (PRD/plan updates in API `documents` + `lib` packages first) → implement ingestion/upload; drop the dev-only seed on first real row.

## Links
[Docs index](../README.md) · [Development plan](../development-plan.md) · [M3 change record](../spec/_cross-cutting/m3-status-badges.md) · [Spec index](../spec/README.md)
