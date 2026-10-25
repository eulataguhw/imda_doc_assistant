# Implementation Plan — web/pages

## Design delta (M1)
Both pages are presentational stubs with honest copy ("M2 wires the live library", "M3 streams real answers") so no fake data is mistaken for live state.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/pages/LibraryPage.tsx` | create | Library view stub |
| `apps/web/src/pages/ChatPage.tsx` | create | Chat view stub |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| WEB-PAGE-1 | page components under routes | build passes; browser pass pending |
| WEB-PAGE-2 | M2 scope | — |
| WEB-PAGE-3 | M3 scope | — |

## Commands
    npm run build -w doc-web

## Deviations
None.

---

## M4 — upload control + error display (spec gate 2026-10-25)

### Design delta
- `lib/api.ts`: add `uploadDocument({title, content})` → `POST /api/documents`, returns the final DTO; `Document` gains optional `errorReason?: string | null`. **Status union unchanged** — enum-sync invariant.
- `LibraryPage.tsx`: working upload panel (title input + content textarea) in the existing layout; on submit call `uploadDocument()`, then re-fetch `listDocuments()` so the new row appears with its final-status badge; inline error text on failure. Keep named export.
- `DocumentDetailPage.tsx`: when `status === "error"`, show `doc.errorReason` (fallback to a neutral message) instead of the hardcoded "Failed to extract text from PDF"; adjust the matching `docMeta.ts` excerpt copy for the error case.

### File operations (M4)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/lib/api.ts` | modify | `uploadDocument()` + optional `errorReason` |
| `apps/web/src/pages/LibraryPage.tsx` | modify | upload form → POST → list refresh |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | real error reason display |
| `apps/web/src/lib/docMeta.ts` | modify | error-case excerpt copy no longer asserts PDF |

### Requirement → step mapping (M4)
| Req | Step | Check |
| --- | --- | --- |
| WEB-PAGE-4 (upload) | LibraryPage form + api helper | browser: submit → row appears with final badge; list reflects API state |
| WEB-PAGE-4 (error display) | detail page + docMeta copy | browser: error doc shows the real reason from the API |

### Commands
    npm run build -w doc-web
    # live check via dev server :5173 proxy → POST round-trip, then list refresh

## Deviations (M4)
Binary file picker deferred with the API transport decision (JSON text body); recorded in the authoritative [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md) scope decision.
