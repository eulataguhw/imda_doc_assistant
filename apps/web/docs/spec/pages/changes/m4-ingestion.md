# Change — m4-ingestion · pages (web UI)

- **Status:** implemented + verified live (2026-10-25). Not committed (approval policy: ask).
- **Approval scope:** user standing instruction to run M4 autonomously; no commits made.
- **Authoritative record:** [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md)

## Delivered in M4

Library gains a working upload control (title + text content → `POST /api/documents` → list refresh with final-status badge). Document detail shows the API's real `error_reason` for failed ingests; PDF-asserting copy removed. `lib/api.ts` adds `uploadDocument()` and optional `errorReason`; status union unchanged (enum-sync invariant preserved).

## Files

| Path                                        | Op     | Reason                                               |
| ------------------------------------------- | ------ | ---------------------------------------------------- |
| `apps/web/src/lib/api.ts`                   | modify | `uploadDocument()` + optional `errorReason`          |
| `apps/web/src/pages/LibraryPage.tsx`        | modify | upload form → POST → list refresh; inline error text |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | real error reason display                            |
| `apps/web/src/lib/docMeta.ts`               | modify | error-case excerpt copy no longer asserts PDF        |

## Verification evidence (live 2026-10-25)

- **Build:** `npm run build -w doc-web` (tsc + vite) exit 0 — no type drift; confirms enum-sync invariant on the web side.
- **WEB-M4-1 upload round-trip (via Vite dev proxy :5173):** SPA `GET /` → 200; `POST /api/documents` through the proxy → HTTP 201, row `51c5869a-…` status `ready`, Qdrant point `5c729205-…` created; `GET /api/documents` via proxy returns the list including `errorReason`.
- **WEB-M4-2 error-reason display:** `DocumentDetailPage.tsx` renders `doc.errorReason` with fallback; `docMeta.ts` error excerpt no longer asserts PDF. Verified in source + build.
- **Boundary (honest):** no browser tooling in this environment — form submit / badge update verified by the proxy round-trip and clean build, not a live DOM pass (same boundary as M3).

## Next action

M4 implemented + verified. Commit/push on explicit approval; then candidate M5 per the cross-cutting record.
