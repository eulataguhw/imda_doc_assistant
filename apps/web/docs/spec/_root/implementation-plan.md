# Implementation Plan — web/_root

## Design delta (M1)
Provider order fixed: StrictMode → ThemeProvider (class strategy) → BrowserRouter. Shell = sticky nav + `<main>` outlet; routes `/`, `/chat`, wildcard `*` → Navigate to `/`.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/main.tsx` | create | provider stack + mount |
| `apps/web/src/App.tsx` | create | shell, nav, routes |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| WEB-ROOT-1 | Routes + wildcard | build passes; browser pass pending |
| WEB-ROOT-2 | ThemeProvider attribute="class" | source inspection |
| WEB-ROOT-3 | NavLink className active fn | source inspection |

## Commands
    npm run build -w doc-web   # tsc + vite build

## Deviations
None.
