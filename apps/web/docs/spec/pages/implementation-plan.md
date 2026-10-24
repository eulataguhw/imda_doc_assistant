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
