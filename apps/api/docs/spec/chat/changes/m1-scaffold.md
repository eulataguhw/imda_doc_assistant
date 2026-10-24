# Change — m1-scaffold · chat

- **Status:** complete + verified (2026-10-22)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1
`POST /api/chat/stream` with the fixed SSE frame contract + edge validation.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/chat/chat.module.ts` | create | module registration |
| `apps/api/src/chat/chat.controller.ts` | create | stream endpoint, validation, frame order |

## Verification evidence
Live capture 2026-10-22 (exact frames):

    data: {"type":"citation","documentId":"doc-abc"}
    data: {"type":"chunk","delta":"This is a stub answer. "}
    data: {"type":"chunk","delta":"M3 streams real LLM tokens. "}
    data: {"type":"done"}

Malformed body `{"nope":1}` → HTTP 400 + JSON error.

Full shared evidence lives in the authoritative record.

## Next action
M3: real RAG streaming behind the same contract; citation frames gain page numbers.
