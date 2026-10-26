# PRD — web/styles (design tokens)

## Problem / baseline

The app needs a consistent light/dark palette without CSS-in-JS; Tailwind v4 + oklch custom properties are the contract.

## Outcome

`globals.css` imports Tailwind and defines `--background/--foreground/--muted/--accent` for `:root` (light) and `html.dark` (dark) in oklch. Components consume these custom properties; theme switching is class-based (see web/_root).

## Scope

- In (M1): token set + import wiring from `main.tsx`.
- Out of scope: component-level utility conventions (documented per-feature as views land).

## Acceptance criteria

| ID          | Criterion                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| WEB-STYLE-1 | `globals.css` imported exactly once (from `main.tsx`) and the build emits CSS. **Verified 2026-10-22: emitted CSS 6.08 kB.** |
| WEB-STYLE-2 | Light + dark token sets both defined; dark keyed on `html.dark`.                                                             |
| WEB-STYLE-3 | No CSS-in-JS or additional style runtime introduced.                                                                         |

## Assumptions / questions

oklch is supported in all target browsers for this demo (modern evergreen).
