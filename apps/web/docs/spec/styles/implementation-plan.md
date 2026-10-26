# Implementation Plan — web/styles

## Design delta (M1)

`@import "tailwindcss";` + four design tokens per theme in oklch; dark variant keyed on `html.dark` to match the next-themes class strategy.

## File operations (M1, all create)

| Path                              | Op     | Reason                              |
| --------------------------------- | ------ | ----------------------------------- |
| `apps/web/src/styles/globals.css` | create | Tailwind import + light/dark tokens |

## Requirement → step mapping

| Req (PRD)   | Step                                      | Check                                          |
| ----------- | ----------------------------------------- | ---------------------------------------------- |
| WEB-STYLE-1 | single import in main.tsx; vite emits CSS | build output lists the css artifact (verified) |
| WEB-STYLE-2 | `:root` + `html.dark` blocks              | source inspection                              |
| WEB-STYLE-3 | no style runtime dep                      | manifest inspection                            |

## Commands

    npm run build -w doc-web   # check emitted CSS size in output

## Deviations

None.
