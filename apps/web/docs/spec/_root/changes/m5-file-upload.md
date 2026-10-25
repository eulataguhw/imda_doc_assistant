# Change — m5-file-upload (web/_root)

Authoritative record: [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md). This note covers only this package's files.

| Path | Op | Reason | Req |
| --- | --- | --- | --- |
| `apps/web/src/App.tsx` | modify | mount `<Toaster/>` once above `<Routes>` (app-wide toast surface) | WEB-M5-2 |
| `apps/web/src/lib/api.ts` | modify | `uploadDocumentFile(file, title?)` FormData POST `/api/documents/upload`; `Document` gains optional `progress?`; JSON `uploadDocument()` retained; status union unchanged | WEB-M5-1, -3 |

Status: **implemented & verified 2026-10-25** — web build exit 0; upload round-trip proven through Vite proxy :5173 (POST → 201 `processing`); Toaster mounted app-wide. Evidence in the authoritative record.
