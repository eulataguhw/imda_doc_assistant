# Change — m5-file-upload (api/documents)

Authoritative record: [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md). This note covers only this package's files.

| Path                                             | Op     | Reason                                                                                                                                                                   | Req          |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `apps/api/src/documents/extract.ts`              | create | `.pdf` (pdfjs-dist) / `.docx` (mammoth) → text; typed errors for unsupported type and no extractable text                                                                | API-M5-1…4   |
| `apps/api/src/documents/queue.ts`                | create | FIFO sequential job runner (chunk→embed→upsert), progress map `{stage,done,total}`, startup sweep of stale `processing` rows; PONYTAIL: worker pool on sustained backlog | API-M5-6, -8 |
| `apps/api/src/documents/documents.service.ts`    | modify | `upload()` = validate + extract + insert `processing` + enqueue → return immediately; job completion flips row; `list()` maps optional `progress`; DTO gains `progress?` | API-M5-1…6   |
| `apps/api/src/documents/documents.controller.ts` | modify | `POST /documents/upload` multipart (FileInterceptor "file"), extension/size guards, title = provided or filename-minus-extension; JSON POST retained                     | API-M5-3…5   |
| `apps/api/src/documents/ingest.ts`               | modify | `embedChunks()` → `config.embedBaseUrl`; `Authorization: Bearer` when `llmApiKey` set (shape unchanged)                                                                  | API-M5-7     |

Status: **implemented & verified 2026-10-25** — API-M5-1…6, -8 live-passed (see authoritative record "Verification evidence" §2–9). Post-build type fixes in `documents.controller.ts` (Nest 12.2 has no `@Fields()`; `FileInterceptor` from package root; local file type) and `extract.ts` (pdfjs v6 `cleanup()`) — rebuild exit 0.
