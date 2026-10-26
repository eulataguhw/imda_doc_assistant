# Change — chat (M8)

Part of [m8-chat-experience](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md). Owner: **Groq**.

## Delta

- `chat.controller.ts`: accept `sessionId?` + `attachments?: string[]`; route to direct mode vs RAG; persist user+assistant into the session after the stream.
- `chat.service.ts`: load last-N history from `messages` when `sessionId` present (client `history` fallback only); **direct mode** — build context from attached docs' full `content`, one `citation` event per attached doc, prompt for inline `[n]`.
- New session endpoints: `GET /sessions`, `POST /sessions`, `GET /sessions/:id` (service + controller).
- Frozen flat SSE contract preserved (`citation*→chunk*→done|error`).

## Files

| Path                                | Op     | Requirement    |
| ----------------------------------- | ------ | -------------- |
| `src/chat/chat.service.ts`          | modify | API-M8-1,2,5,6 |
| `src/chat/chat.controller.ts`       | modify | API-M8-1,2,4,5 |
| `src/lib/db.ts` (sessions/messages) | modify | API-M8-1,2     |

## Checks

- Vitest: session CRUD; context load by sessionId; direct-mode prompt includes attached docs' text + one citation event each. Mock Qdrant/LLM. Isolated DB.
- E2E (lead): new/revisit session; upload→answer with inline citations.

## Result (2026-10-26)

All green — API vitest 18/18 (incl. session CRUD + direct-mode prompt); Playwright E2E chat.spec.ts 3/3 (direct attach→cited answer, RAG, new/revisit). Full evidence: [authoritative record](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md#evidence-phase-2--actual-results-2026-10-26).
