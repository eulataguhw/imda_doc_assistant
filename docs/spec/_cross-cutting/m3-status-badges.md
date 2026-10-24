# Change Record — m3-status-badges (authoritative)

- **Goal:** M3 — wire the library list/detail views to real status data and apply a semantic light+dark color palette, so every status badge (`ready`/`processing`/`error`) is verifiable in the UI.
- **Status:** complete + verified (2026-10-24).
- **Approval scope:** user standing instruction — implement M3 (data layer + views + palette) and pause at the milestone boundary. No commits/pushes made.

## Before → after
M2 left stub views (`LibraryPage`/`DocumentDetailPage` placeholders), a hard-coded `documents.service.ts`, no status color tokens, and a `/library` nav link with no matching route. After M3: `GET /api/documents` reads a seeded SQLite table; the web app fetches that list, renders it with per-status badges in both themes, and adds a detail route + shared client.

## Deliverables
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/documents/documents.service.ts` | modify | `list()` reads the persisted `documents` table (typed row mapping) instead of returning a hard-coded array |
| `apps/api/src/lib/db.ts` | modify | idempotent seed (3 fixed-id rows, one per status) guarded on `COUNT(*) = 0`; PONYTAIL dev-only marker |
| `apps/web/src/styles/globals.css` | modify | semantic status tokens `--ready/--processing/--error` in `:root` + `html.dark` (oklch) |
| `apps/web/src/lib/api.ts` | create | shared typed client: `Document` type + `listDocuments()` against `/api/documents` |
| `apps/web/src/components/StatusBadge.tsx` | create | status pill mapping each status to its CSS var via inline style (theme-agnostic) |
| `apps/web/src/pages/LibraryPage.tsx` | modify | fetch list; error/loading/empty/list states; per-row badge + detail link; named export |
| `apps/web/src/pages/DocumentDetailPage.tsx` | create | `/documents/:id` lookup; error/not-found/loading/content; back-link; named export |
| `apps/web/src/App.tsx` | modify | add `/documents/:id` route and the missing `/library` route (nav link parity) |

## Verification evidence (live, 2026-10-24)
- `npm run build -w doc-api` → exit 0 (tsc clean after typed row mapping; earlier TS2352 cast resolved).
- `npm run build -w doc-web` → exit 0; emitted CSS 7.82 kB, JS 267.80 kB.
- API boot log: `{/api/documents, GET}` mapped; `doc-api listening on :3001`.
- `GET :3001/api/documents` → 3 docs: `doc-sample-error/error`, `doc-sample-processing/processing`, `doc-sample-ready/ready` (curl exit 0).
- Emitted CSS contains `--ready/--processing/--error` in **both** `:root` and `html.dark` blocks.
- Emitted JS references `var(--ready)/var(--processing)/var(--error)` (badge) and `` fetch(`${BASE}/documents`) `` (client wiring).
- Web dev server: `GET :5173/` → HTTP 200; `GET :5173/api/documents` (vite proxy → :3001) returns all three seeded statuses.
- **Boundary:** pixel-level visual confirmation of badge colors requires opening http://localhost:5173 in a browser — the full data→bundle→serve pipeline is verified headlessly; interactive render sign-off is the one step not done here.

## Non-goals / follow-ups
- No upload/ingestion (M4) — seed rows are dev-only samples, slated for removal when real uploads land (see PONYTAIL marker in `db.ts`).
- Status enum stays authoritative across `documents.service.ts`, `lib/api.ts`, and `StatusBadge.tsx`; DB `CHECK` constraint mirrors the TS union.

## Next action
Await user approval → M4 (ingestion/upload) — spec the `documents` + `lib` (API) packages first; drop the dev-only seed when real rows arrive.
