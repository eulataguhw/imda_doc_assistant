# Change — m6-rag-chat · documents

- **Status:** complete + verified live (2026-10-25)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6

Best-effort LLM summary during ingestion (failure → warn + continue, row still `ready`), real `pages` (PDF page count; DOCX null) and `size_bytes` stored and exposed on list rows.

## Files

| Path                                          | Op     | Reason                                                                                                                                                                                              |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/documents/extract.ts`           | modify | `ExtractResult` gains `pages` + `pageStarts`; PDF real page count & char offsets; DOCX `pages: null`                                                                                                |
| `apps/api/src/documents/ingest.ts`            | modify | `chunkPages()` per-chunk page attribution; `upsertPoints()` payload gains `page?`; `generateSummary()` non-stream chat/completions (8000-char slice, env sampling params, Bearer only when key set) |
| `apps/api/src/documents/queue.ts`             | modify | job order summary→chunk→embed→upsert→ready; `"summarizing"` stage; summary failure = warn + empty summary                                                                                           |
| `apps/api/src/documents/documents.service.ts` | modify | DTO gains `createdAt?/summary?/pages?/sizeBytes?`; `ROW_SQL` reads new columns; empty-string summary → absent field                                                                                 |

## Verification evidence (abridged)

- Fresh PDF upload → `ready`, real LLM summary, `pages: 1`, `sizeBytes: 758`, `createdAt` present.
- Fresh DOCX upload → `ready`, real summary, `sizeBytes: 1162`, no `pages` field (correct for DOCX).
- Upload with LLM down during summary step → row still `ready`, no `summary` field, API log warning `summary generation failed … continuing with empty summary`.

Full shared evidence lives in the authoritative record.

## Next action

Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
