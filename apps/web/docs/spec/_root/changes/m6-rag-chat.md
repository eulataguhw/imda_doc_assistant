# Change — m6-rag-chat · _root

- **Status:** complete + verified (2026-10-25; build exit 0)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6

Real `streamChat()` against the frozen SSE contract (flat top-level fields per event type, mapped to the client's nested `ChatStreamEvent` at the parse boundary), plus `Document` type extension.

## Files

| Path                      | Op     | Reason                                                                                                                                                                                                                                                                             |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/api.ts` | modify | `streamChat({question, documentIds?, history?, onEvent})` — POST fetch, ReadableStream SSE parsing (`\n\n` frames, `data: ` prefix), dispatch `citation`/`chunk`/`done`/`error`; non-2xx rejects with the JSON body's message; `Document` gains `summary?`, `pages?`, `sizeBytes?` |

## Verification evidence (abridged)

- `npm run build` exit 0.
- Frame shapes verified live at the API boundary (citations carry `documentId`/`title`/`page?`/`score`; mid-stream failure → `{"type":"error","reason":…}`; non-2xx JSON body surfaced as rejection).

Full shared evidence lives in the authoritative record.

## Next action

Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
