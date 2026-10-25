# Change — m6-rag-chat · chat

- **Status:** complete + verified live (2026-10-25)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6
Real RAG behind the frozen SSE contract: Qdrant top-k retrieval (global or scoped to `documentIds`), context-grounded prompt with ≤6-message history, streaming LLM deltas. Controller keeps the flat contract (`citation`* → `chunk`* → `done` | `error`) and maps pre-first-byte failures to JSON 502 / validation to 400.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/chat/chat.service.ts` | create | retrieval (`with_payload: true` — this Qdrant build omits payloads otherwise), prompt assembly, streaming parse of upstream SSE (skips `reasoning_content` frames) |
| `apps/api/src/chat/chat.controller.ts` | rewrite | validation → 402/400 JSON; pre-first-byte try/catch → 502; then flushHeaders + frozen contract events; client abort cancels upstream body |
| `apps/api/src/chat/chat.module.ts` | modify | register `ChatService` provider |

## Verification evidence (abridged)
- Global stream: 6 citations (real ids/titles, PDF hit carries `page:1`) → context-grounded answer citing `[1]…[6]` → `done`.
- Scoped to one document id: exactly 1 in-scope citation vs 6 globally (API-M6-2).
- History turn reached the LLM (model quoted the prior assistant message) — API-M6-3.
- Mid-stream LLM death → `{"type":"error","reason":"terminated"}` after chunks; LLM down pre-first-byte → HTTP 502 JSON; malformed bodies → 400 JSON.

Full shared evidence lives in the authoritative record.

## Next action
Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
