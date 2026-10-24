# PRD — web/pages (Library + Chat views)

## Problem / baseline
Two stub views exist so routing/shell can be verified; M2/M3 fill them with live behavior.

## Outcome
- **Library** (M2): lists live `/api/documents` data, upload affordance, status badges (`processing`/`ready`/`error`).
- **Chat** (M3): question input + document selection; consumes `POST /api/chat/stream`; renders streamed chunks into the current message; citation chips showing `documentId` (+ page in M3).

## Scope
- In (M1): compilable stubs with honest placeholder copy.
- Out of scope: session persistence (M4), error/empty-state polish (M4).

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| WEB-PAGE-1 | Both views render under their routes. (Build-verified M1; browser pass pending.) |
| WEB-PAGE-2 (M2) | Library reflects `GET /api/documents` including status transitions. |
| WEB-PAGE-3 (M3) | Chat streams chunks incrementally and renders citation chips from frames. |

## Assumptions / questions
None blocking; M3 message model (local state vs zustand store) decided during M3 spec — zustand is installed for it.
