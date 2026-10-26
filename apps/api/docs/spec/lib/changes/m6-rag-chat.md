# Change — m6-rag-chat · lib

- **Status:** complete + verified live (2026-10-25)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6

Idempotent migration for the new `documents` columns and the three chat/summary sampling env keys (API-M6-7).

## Files

| Path                      | Op     | Reason                                                                                                                                                |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/db.ts`  | modify | guarded idempotent ALTERs: `summary TEXT`, `pages INTEGER`, `size_bytes INTEGER` on `documents`                                                       |
| `apps/api/src/lib/env.ts` | modify | remove dead `summaryModel`; add `llmTemperature` (LLM_TEMPERATURE ?? 0.2), `llmTopP` (only when set → omitted from request), `llmMaxTokens` (?? 1024) |

## Verification evidence (abridged)

- Migration ran on boot against the existing DB (15 legacy rows intact; legacy list rows expose `createdAt` only).
- Grep: `LLM_TEMPERATURE` / `LLM_TOP_P` / `LLM_MAX_TOKENS` present in `env.ts`, `.env.example`, `docs/plan.md`.

Full shared evidence lives in the authoritative record.

## Next action

Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
