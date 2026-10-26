# Change — m5-file-upload (api/lib)

Authoritative record: [m5-file-upload](../../../../../../docs/spec/_cross-cutting/m5-file-upload.md). This note covers only this package's files.

| Path                      | Op     | Reason                                                                                                                                                                                      | Req          |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `apps/api/src/lib/env.ts` | modify | `embedBaseUrl` (`EMBED_BASE_URL`, fallback `llmBaseUrl`), `llmApiKey` (`LLM_API_KEY`), `maxUploadMb` (`MAX_UPLOAD_MB`, default 10) — provider-agnostic contract per master plan ENV section | API-M5-7, -8 |

No schema change. Status: **implemented & verified 2026-10-25** — `EMBED_BASE_URL` override + `LLM_API_KEY` Bearer proven live against mock :9999 (mock log: `authorization=Bearer test-key-123`, doc reached `ready`); `MAX_UPLOAD_MB=1` cap enforced (`File too large (max 1 MB)`). Full evidence in the authoritative record.
