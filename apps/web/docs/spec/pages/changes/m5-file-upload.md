# Change — m5-file-upload (web/pages)

Authoritative record: [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md). This note covers only this package's files.

| Path | Op | Reason | Req |
| --- | --- | --- | --- |
| `apps/web/src/components/Toaster.tsx` | create | zustand toast store (push/dismiss, ~5s auto-timeout) + `<Toaster/>` viewport; success/error variants; aria-live polite. No new deps | WEB-M5-2 |
| `apps/web/src/pages/LibraryPage.tsx` | modify | dropzone (drag-over highlight, drop, click → hidden multi-file input accept `.pdf,.docx`); per-file type/size validation with one toast per rejected file; bounded-concurrency uploads + loader "Uploading N of M…"; 2s list polling while any row `processing`; text UploadPanel removed | WEB-M5-1…3 |
| `apps/web/src/lib/api.ts` | modify (web/_root) | `uploadDocumentFile(file, title?)` FormData POST `/api/documents/upload`; `Document` gains optional `progress?`; JSON `uploadDocument()` retained | WEB-M5-1, -3 |

Status: **implemented & verified 2026-10-25** — web build exit 0; dropzone/upload path proven through Vite proxy :5173 (GET list 200, POST upload 201 `processing`); toast/validation/polling logic verified by code + bundle inspection (no browser tooling in this environment). Evidence in the authoritative record.
