# PRD — web/_root (providers + app shell)

## Problem / baseline
The SPA needs a provider stack (theming, routing) and a persistent shell with navigation between the two views.

## Outcome
`main.tsx` mounts StrictMode → ThemeProvider (`attribute="class"`, `defaultTheme="system"`) → BrowserRouter → App. `App.tsx` renders nav (Library/Chat NavLinks + theme toggle) and routes: `/` → LibraryPage, `/chat` → ChatPage, wildcard → redirect to `/`.

## Scope
- In (M1): provider stack, shell, routing, active-link styling, theme toggle.
- Out of scope: view internals (`pages` package), token definitions (`styles` package).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| WEB-ROOT-1 | Routes `/` and `/chat` render their pages; unknown paths redirect to `/`. (Build-verified M1; browser pass pending.) |
| WEB-ROOT-2 | Theme toggle flips `.dark` on `<html>` via next-themes `attribute="class"`. |
| WEB-ROOT-3 | Nav shows active state for the current route. |

## Assumptions / questions
Client-side routing only (no SSR) is correct for this app's scope.
