# Change — m6-rag-chat · pages

- **Status:** complete + verified (2026-10-25; build exit 0, API round-trips via :5173 proxy — live click-through left to user)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6
ChatPage consumes the real SSE stream (fake `buildAnswer()`/timers deleted), citation chips are links to `/documents/:id` with page suffix when present, mid-stream errors toast + annotate the message. DocumentDetailPage shows the API summary and real pages/size/upload date; `docMeta.ts` is fallback-only for absent fields (legacy rows).

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/pages/ChatPage.tsx` | rewrite | `streamChat()` consumption, event dispatch (incl. `error` → toast + message patch, no history push), citation chips as `<Link>`, abort on unmount |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | header meta row conditional on real fields; error branch shows `doc.errorReason`; "Ask about this document" link → `/chat?docId=…` |
| `apps/web/src/pages/LibraryPage.tsx` | modify | ready subtitle from real `pages`/size/date parts (filter absent) |
| `apps/web/src/lib/docMeta.ts` | rewrite | fake FNV metadata removed; `formatBytes`/`formatDate`; excerpt = error → reason, processing → note, ready → API summary or neutral fallback line |

## Verification evidence (abridged)
- `npm run build` exit 0 (dist 289.44 kB JS).
- Stream events verified at the API boundary (citations/chunks/done/error frames); ChatPage `onEvent` handles each type per code review — DOM click-through left to user (no browser tooling in sandbox).

Full shared evidence lives in the authoritative record.

## Next action
Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
