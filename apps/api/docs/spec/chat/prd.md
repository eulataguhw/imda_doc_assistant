# PRD — api/chat (SSE answer stream)

## Problem / baseline
Chat answers must stream token-by-token with citations to source documents. The frame contract is fixed in M1 so the web client and tests can build against it before RAG exists.

## Outcome
`POST /api/chat/stream` accepts `{question:string, documentIds:string[]}` and emits SSE frames: one `citation` per documentId → N× `chunk` deltas → `done`. Invalid bodies get 400 + `{error}` before streaming starts. M3 replaces the stub body with real RAG (retrieval over cited docs; citation frames gain page numbers).

## Scope
- In (M1): endpoint, validation, frame emission order, `text/event-stream` content type.
- In (M3): retrieval + LLM streaming; page-level citations in citation frames.
- In (M8): **session history persistence** (`sessionId` → server-side last-N context from `messages`, append user+assistant after stream); **direct-document mode** (`attachments: string[]` → attached docs' full `content` as context, one `citation` frame per attached doc, inline `[n]` references). Direct mode takes precedence over RAG for a message with attachments; else RAG.
- Out of scope: abort/cancel semantics (M4), OCR.

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| API-CHAT-1 | Frame order citation → chunk* → done, blank-line terminated, `text/event-stream`. **Verified 2026-10-22** (exact frames in change record). |
| API-CHAT-2 | Non-string `question` or non-array `documentIds` → HTTP 400 + JSON `{error}`. **Verified 2026-10-22: body `{"nope":1}` → 400.** |
| API-CHAT-3 (M3) | Citation frames reference only ids sent in the request and include page numbers from chunk metadata. |
| API-CHAT-4 (M8) | `POST /chat/stream` with `sessionId` loads last-N server history as context and appends user+assistant to `messages` after the stream completes. See [m8-chat-experience](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md) API-M8-2. |
| API-CHAT-5 (M8) | Direct mode (`attachments`) sends attached docs' full text as context and emits one `citation` frame per attached doc; takes precedence over RAG when attachments are present. See m8 API-M8-5/6. |

## Assumptions / questions
SSE over plain HTTP (not WebSocket) is sufficient for M3 streaming volumes. M8 direct mode reuses the frozen flat SSE contract — no new frame types.
