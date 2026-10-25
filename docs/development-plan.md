# Development Plan — Doc Assistant

## Milestones (root pattern)

| # | Milestone | Status recorded | Evidence embedded in row |
| --- | --- | --- | --- |
| M1 | Root docs + scaffolding status baseline | Done 2026-10-22 (verified) | initial root-pattern milestone entries with evidence strings |
| M2 | Status metadata layer, qdrant collection config on :6333, css token names | **Done 2026-10-23** — qdrant REST collections list recorded; css token names from live styles file (:root + .dark); storage layout unchanged |
| M3 | Library list/detail views wired to status badges, semantic color palette applied | **Done 2026-10-24** (verified) | API `GET /api/documents` → 3 seeded docs (ready/processing/error), live curl; web build exit 0 (CSS 7.82 kB); emitted CSS has `--ready/--processing/--error` in `:root` + `.dark`; SPA :5173 → HTTP 200 and `/api/documents` proxy hop returns all 3 statuses · [record](spec/_cross-cutting/m3-status-badges.md) |
| M4 | Ingestion/upload pipeline: `POST /api/documents` (JSON text), chunk → Ollama embed → Qdrant upsert, status lifecycle + error reasons, web upload control | **Implemented + verified live (2026-10-25)** — happy/error/validation paths exercised against running Qdrant+Ollama; web round-trip via Vite proxy · [record](spec/_cross-cutting/m4-ingestion.md) |
| M5 | File upload: `POST /api/documents/upload` (multipart `.pdf`/`.docx`, env-capped size), sync extraction + async FIFO indexing with per-doc progress, web drag-drop multi-file dropzone with per-file rejection toasts; completes v3-M2 | **Implemented + verified live (2026-10-25)** — PDF/DOCX → 201 `processing` → queue → `ready`, Qdrant points carry extracted text; rejections exact (type/no-text/missing-field, `MAX_UPLOAD_MB=1` cap); boot-sweep flips stale rows to `error`; provider switch proven via mock :9999 with `Bearer test-key-123` + live progress mid-flight; 3-file batch → 3 independent rows all `ready`; web dropzone round-trip via Vite proxy · [record](spec/_cross-cutting/m5-file-upload.md) |
| M6 | RAG chat: real `POST /api/chat/stream` (Qdrant top-k retrieval, global or scoped to selected docs, ≤6-message history, streaming LLM over the frozen SSE contract; ChatPage consumes it, fakes deleted) + LLM document summary at ingest (`summary`/`pages`/`size_bytes` in sqlite, real metadata on detail page); completes v3-M3 | **Implemented + verified live (2026-10-25)** — both builds exit 0; fresh PDF+DOCX → `ready` with real summaries/pages/size; global stream = 6 citations (real ids/titles/page) → context-grounded answer citing [1]–[6] → `done`; scoped set ≠ global set (API-M6-2); history turn reached the LLM (model quoted prior assistant message); mid-stream LLM death → `{"type":"error","reason":"terminated"}`; pre-first-byte LLM down → JSON 502; validation → 400; LLM-down summary step → row `ready` + empty summary + warn log · [record](spec/_cross-cutting/m6-rag-chat.md) |

## Rules
- Each milestone = one batch. Record status inside the existing root pattern, no new files.
- Embed evidence strings directly in status cells (live values, not promises).
- Pause at each milestone boundary; proceed on explicit approval only.
