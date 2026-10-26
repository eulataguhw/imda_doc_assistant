# Change — m3-status-badges · pages (web)

- **Status:** complete + verified headlessly (2026-10-24); interactive browser render sign-off pending.
- **Approval scope:** user standing instruction to implement M3 and pause at the boundary; no commits made.
- **Authoritative record:** [m3-status-badges](../../../../../../docs/spec/_cross-cutting/m3-status-badges.md)

## Delivered in M3

`LibraryPage` fetches `/api/documents` and renders error/loading/empty/list states with a per-row status badge + detail link. New `DocumentDetailPage` resolves `/documents/:id`. Both use **named exports** to match `App.tsx` (and the existing `ChatPage` convention).

## Files

| Path                                        | Op     | Reason                                                                            |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `apps/web/src/pages/LibraryPage.tsx`        | modify | fetch + 4 states; per-row badge & detail link; named export                       |
| `apps/web/src/pages/DocumentDetailPage.tsx` | create | `/documents/:id` lookup; error/not-found/loading/content; back-link; named export |
| `apps/web/src/components/StatusBadge.tsx`   | create | status pill → CSS var via inline style (theme-agnostic)                           |

## Verification evidence

`npm run build -w doc-web` exit 0; emitted JS references `var(--ready/--processing/--error)` and ``fetch(`${BASE}/documents`)``. SPA :5173 → HTTP 200 and `/api/documents` proxy returns all 3 statuses. Pixel-level visual confirmation requires opening http://localhost:5173 in a browser.

Full shared evidence lives in the authoritative record.

## Next action

M4: detail view streams real document content (currently list + badge only).
