# Change — pages (M8)

Part of [m8-chat-experience](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md). Owners: **Cerebras** (non-chat), **lead** (ChatPage).

## Delta
- `lib/api.ts` (Cerebras, single writer): `listDocuments({origin?})`, `deleteDocument(id)`, `uploadChatDocument(file,title?)`, `listSessions()`, `createSession(title?)`, `getSession(id)`; `streamChat(...)` gains `sessionId?`/`attachments?`.
- `pages/KnowledgePage.tsx` (Cerebras): renamed current Library; route `/knowledge`; keeps upload dropzone.
- `pages/LibraryPage.tsx` (Cerebras): new — lists `origin=chat` docs, no upload control, per-doc delete button.
- `App.tsx` + `components/AppShell.tsx` (Cerebras): routes Knowledge+Library+Chat; `/` → Knowledge; nav three items.
- `pages/ChatPage.tsx`, `components/Markdown.tsx`, `lib/markdown.ts` (lead): markdown via `react-markdown`+`remark-gfm`; inline `[n]`→chip; selectable "Scoped to" picker; drag-drop upload in composer; conversation history (new/revisit).

## Files
| Path | Op | Owner | Requirement |
| --- | --- | --- | --- |
| `src/lib/api.ts` | modify | Cerebras | all web |
| `src/pages/KnowledgePage.tsx` | new | Cerebras | WEB-M8-8,10 |
| `src/pages/LibraryPage.tsx` | modify (new meaning) | Cerebras | WEB-M8-8,9,10 |
| `src/App.tsx`, `src/components/AppShell.tsx` | modify | Cerebras | WEB-M8-9 |
| `src/pages/ChatPage.tsx` | modify | lead | WEB-M8-1…7 |
| `src/components/Markdown.tsx`, `src/lib/markdown.ts` | new | lead | WEB-M8-1…3 |

## Checks
- Vitest (Cerebras): Knowledge/Library render + delete action; `api.ts` helpers. Vitest (lead): markdown renders; `[n]`→chip transform.
- E2E (lead): upload→chat→answer+citations; RAG vs direct; Knowledge/Library split; delete; new/revisit session.

## Result (2026-10-26)
All green — web vitest 20/20 (markdown/citation transform, api.ts helpers, Knowledge/Library render+delete); Playwright E2E chat.spec.ts 3/3 + knowledge/library.spec.ts 2/2. Route fix verified (`/api/sessions`→`/api/chat/sessions`). Full evidence: [authoritative record](../../../../../../docs/spec/_cross-cutting/m8-chat-experience.md#evidence-phase-2--actual-results-2026-10-26).
