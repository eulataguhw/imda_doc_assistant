# PRD — web/pages (Library + Chat views)

## Problem / baseline
Two stub views exist so routing/shell can be verified; M2/M3 fill them with live behavior.

## Outcome
- **Library** (M2/M4): lists live `/api/documents` data; **working upload control** (title + text content → `POST /api/documents`, M4) that persists a document and refreshes the list; status badges (`processing`/`ready`/`error`).
- **Document detail**: shows the real `errorReason` for failed ingests instead of PDF-asserting copy (M4).
- **Chat** (M3): question input + document selection; consumes `POST /api/chat/stream`; renders streamed chunks into the current message; citation chips showing `documentId` (+ page in M3).

## Scope
- In (M1): compilable stubs with honest placeholder copy.
- In (M4): upload form on Library; error-reason display on detail; `uploadDocument()` client helper.
- Out of scope: binary file picker / PDF dropzone (deferred with the API transport decision), session persistence, empty-state polish beyond M4's error copy fix.

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| WEB-PAGE-1 | Both views render under their routes. (Build-verified M1; browser pass pending.) |
| WEB-PAGE-2 (M2) | Library reflects `GET /api/documents` including status transitions. |
| WEB-PAGE-3 (M3) | Chat streams chunks incrementally and renders citation chips from frames. |
| WEB-PAGE-4 (M4) | Library upload control persists a document via `POST /api/documents` and the list refreshes with the final-status badge; detail page shows the real error reason for `error` docs. Status union in `lib/api.ts` stays identical to API/DB/badge surfaces. |

## Assumptions / questions
None blocking; M3 message model (local state vs zustand store) decided during M3 spec — zustand is installed for it.
