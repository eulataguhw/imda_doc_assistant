# Change — m3-status-badges · _root (web)

- **Status:** complete + verified headlessly (2026-10-24).
- **Approval scope:** user standing instruction to implement M3 and pause at the boundary; no commits made.
- **Authoritative record:** [m3-status-badges](../../../../../../docs/spec/_cross-cutting/m3-status-badges.md)

## Delivered in M3
Added the `/documents/:id` route (and the previously-missing `/library` route for nav-link parity) to `App.tsx`. New shared typed client `src/lib/api.ts` (`Document` type + `listDocuments()` against `/api/documents`) centralizes the fetch so pages don't each own a `fetch` call.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/App.tsx` | modify | add `/documents/:id` + `/library` routes; named import for new detail page |
| `apps/web/src/lib/api.ts` | create | shared typed client: `Document` union type + `listDocuments()` (throws on non-2xx) |

## Verification evidence
`npm run build -w doc-web` exit 0; emitted JS references `` fetch(`${BASE}/documents`) `` and the `/documents/:id`, `/library`, `/chat`, `*→/` routes. SPA :5173 → HTTP 200; `/api/documents` proxy returns all 3 seeded statuses.

Full shared evidence lives in the authoritative record.

## Next action
M4: extend the client with upload/chat endpoints as they land.
