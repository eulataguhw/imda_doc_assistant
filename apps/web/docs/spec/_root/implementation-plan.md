# Implementation Plan — web/_root

## Design delta (M1)

Provider order fixed: StrictMode → ThemeProvider (class strategy) → BrowserRouter. Shell = sticky nav + `<main>` outlet; routes `/`, `/chat`, wildcard `*` → Navigate to `/`.

## File operations (M1, all create)

| Path                    | Op     | Reason                 |
| ----------------------- | ------ | ---------------------- |
| `apps/web/src/main.tsx` | create | provider stack + mount |
| `apps/web/src/App.tsx`  | create | shell, nav, routes     |

## Requirement → step mapping

| Req (PRD)  | Step                            | Check                              |
| ---------- | ------------------------------- | ---------------------------------- |
| WEB-ROOT-1 | Routes + wildcard               | build passes; browser pass pending |
| WEB-ROOT-2 | ThemeProvider attribute="class" | source inspection                  |
| WEB-ROOT-3 | NavLink className active fn     | source inspection                  |

## Commands

    npm run build -w doc-web   # tsc + vite build

## Deviations

None.

---

## M5 — app-wide Toaster mount + file-upload client (spec gate 2026-10-25)

### Design delta

- `App.tsx`: render `<Toaster/>` once, above `<Routes>` (inside the existing provider tree). No other shell changes.
- `lib/api.ts`: add `uploadDocumentFile(file: File, title?: string)` → FormData (`file`, optional `title`) POST `/api/documents/upload`; returns the DTO (status `processing`). `Document` gains optional `progress?: {stage: string; done: number; total: number}`. **Status union unchanged** — enum-sync invariant. `uploadDocument()` (JSON) retained.

### File operations (M5)

| Path                      | Op     | Reason                                               |
| ------------------------- | ------ | ---------------------------------------------------- |
| `apps/web/src/App.tsx`    | modify | mount `<Toaster/>` once above routes                 |
| `apps/web/src/lib/api.ts` | modify | `uploadDocumentFile()` + optional `progress?` on DTO |

### Requirement → step mapping (M5)

| Req                          | Step          | Check                                                                                          |
| ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| WEB-M5-2 (toasts app-wide)   | App.tsx mount | source: single `<Toaster/>` above Routes; toasts fire from LibraryPage without per-page mounts |
| WEB-M5-1 (upload round-trip) | api.ts helper | Vite proxy: FormData POST → 201 `processing`; progress field present while indexing            |

## Deviations (M5)

None.
