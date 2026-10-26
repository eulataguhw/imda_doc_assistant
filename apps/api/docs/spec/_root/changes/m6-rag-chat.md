# Change — m6-rag-chat · _root

- **Status:** complete + verified live (2026-10-25)
- **Approval scope:** user standing instruction "Run autonomously and complete milestones"; M6 decisions locked via ask_user_question. No commits until explicitly approved.
- **Authoritative record:** [m6-rag-chat](../../../../docs/spec/_cross-cutting/m6-rag-chat.md)

## Delivered in M6

ENV contract documentation for the three new sampling keys (API-M6-7).

## Files

| Path                    | Op     | Reason                                                                                               |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `apps/api/.env.example` | modify | document `LLM_TEMPERATURE`, `LLM_TOP_P`, `LLM_MAX_TOKENS` (same change as `env.ts` + `docs/plan.md`) |

## Verification evidence (abridged)

- Grep: all three keys present in `.env.example`.

Full shared evidence lives in the authoritative record.

## Next action

Milestone M6 complete — v3-M3 done. Pause at milestone boundary per standing instruction.
