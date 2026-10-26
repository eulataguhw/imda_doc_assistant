# Implementation Plan — web/pages

## Design delta (M1)

Both pages are presentational stubs with honest copy ("M2 wires the live library", "M3 streams real answers") so no fake data is mistaken for live state.

## File operations (M1, all create)

| Path                                 | Op     | Reason            |
| ------------------------------------ | ------ | ----------------- |
| `apps/web/src/pages/LibraryPage.tsx` | create | Library view stub |
| `apps/web/src/pages/ChatPage.tsx`    | create | Chat view stub    |

## Requirement → step mapping

| Req (PRD)  | Step                         | Check                              |
| ---------- | ---------------------------- | ---------------------------------- |
| WEB-PAGE-1 | page components under routes | build passes; browser pass pending |
| WEB-PAGE-2 | M2 scope                     | —                                  |
| WEB-PAGE-3 | M3 scope                     | —                                  |

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

| Path                                        | Op     | Reason                                        |
| ------------------------------------------- | ------ | --------------------------------------------- |
| `apps/web/src/lib/api.ts`                   | modify | `uploadDocument()` + optional `errorReason`   |
| `apps/web/src/pages/LibraryPage.tsx`        | modify | upload form → POST → list refresh             |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | real error reason display                     |
| `apps/web/src/lib/docMeta.ts`               | modify | error-case excerpt copy no longer asserts PDF |

### Requirement → step mapping (M4)

| Req                        | Step                          | Check                                                                   |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| WEB-PAGE-4 (upload)        | LibraryPage form + api helper | browser: submit → row appears with final badge; list reflects API state |
| WEB-PAGE-4 (error display) | detail page + docMeta copy    | browser: error doc shows the real reason from the API                   |

### Commands

    npm run build -w doc-web
    # live check via dev server :5173 proxy → POST round-trip, then list refresh

## Deviations (M4)

Binary file picker deferred with the API transport decision (JSON text body); recorded in the authoritative [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md) scope decision. Superseded by M5 below.

---

## M5 — dropzone + toasts + live indexing progress (spec gate 2026-10-25)

### Design delta

- **Dropzone replaces the text panel.** `LibraryPage.tsx`: drag-over highlight; drop handler + click → hidden `<input type="file" multiple accept=".pdf,.docx">`. Per-file client validation (extension in `{.pdf,.docx}`; size ≤ `MAX_UPLOAD_MB` fetched from a small config endpoint or hardcoded default 10 — decide at implementation, prefer API-provided limit) with **one toast per rejected file** naming the file and reason ("removed — unsupported type" / "too large (max N MB)"). Acceptable files POST in bounded concurrency (~2); loader "Uploading N of M…" while in flight.
- **Toasts.** New `components/Toaster.tsx`: zustand store (`push(kind, message)`, auto-dismiss ~5s, manual dismiss) + `<Toaster/>` viewport (fixed bottom-right, aria-live polite). No new deps — `zustand` already installed.
- **Live progress.** While any list row is `processing`, poll `listDocuments()` every 2s; `processing` cards render the API's `progress` (`Embedding N/M chunks`) when present, stage label otherwise. Stop polling when all settle.
- **api.ts:** add `uploadDocumentFile(file: File, title?: string)` → FormData POST `/api/documents/upload`; `Document` gains optional `progress?: {stage: string; done: number; total: number}`. Status union unchanged (enum-sync invariant). Keep `uploadDocument()` (JSON) — API-level capability retained.
- **App.tsx** (web/_root): mount `<Toaster/>` once above routes.

### File operations (M5)

| Path                                  | Op                 | Reason                                                                               |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `apps/web/src/components/Toaster.tsx` | create             | toast store + viewport (zustand, no new dep)                                         |
| `apps/web/src/pages/LibraryPage.tsx`  | modify             | dropzone; per-file validation + toasts; loader; progress polling; text panel removed |
| `apps/web/src/lib/api.ts`             | modify             | `uploadDocumentFile()`; optional `progress` on DTO                                   |
| `apps/web/src/App.tsx`                | modify (web/_root) | mount `<Toaster/>` once                                                              |

### Requirement → step mapping (M5)

| Req      | Step                                              | Check                                                                                                   |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| WEB-M5-1 | dropzone → uploadDocumentFile → list refresh/poll | Vite proxy round-trip: PDF + DOCX → 201s → `processing` w/ progress → `ready`; loader visible in flight |
| WEB-M5-2 | per-file validation + Toaster                     | bad type / oversize → one toast each naming file + reason; no row added; good files still upload        |
| WEB-M5-3 | text panel removed; JSON endpoint retained        | Library has no text form; `curl POST /api/documents` (JSON) still 201                                   |

### Commands

    npm run build -w doc-web
    # live: dev server :5173 proxy → drop/select files → observe toasts, loader, progress → ready

## Deviations (M5)

Client-side size limit: prefer an API-provided value if trivially exposed; otherwise mirror the default 10 MB constant with a PONYTAIL note. No new web dependencies (zustand installed).
