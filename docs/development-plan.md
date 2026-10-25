# Development Plan — Doc Assistant

## Milestones (root pattern)

| # | Milestone | Status recorded | Evidence embedded in row |
| --- | --- | --- | --- |
| M1 | Root docs + scaffolding status baseline | Done 2026-10-22 (verified) | initial root-pattern milestone entries with evidence strings |
| M2 | Status metadata layer, qdrant collection config on :6333, css token names | **Done 2026-10-23** — qdrant REST collections list recorded; css token names from live styles file (:root + .dark); storage layout unchanged |
| M3 | Library list/detail views wired to status badges, semantic color palette applied | **Done 2026-10-24** (verified) | API `GET /api/documents` → 3 seeded docs (ready/processing/error), live curl; web build exit 0 (CSS 7.82 kB); emitted CSS has `--ready/--processing/--error` in `:root` + `.dark`; SPA :5173 → HTTP 200 and `/api/documents` proxy hop returns all 3 statuses · [record](spec/_cross-cutting/m3-status-badges.md) |
| M4 | Ingestion/upload pipeline: `POST /api/documents` (JSON text), chunk → Ollama embed → Qdrant upsert, status lifecycle + error reasons, web upload control | **Implemented + verified live (2026-10-25)** — happy/error/validation paths exercised against running Qdrant+Ollama; web round-trip via Vite proxy · [record](spec/_cross-cutting/m4-ingestion.md) |

## Rules
- Each milestone = one batch. Record status inside the existing root pattern, no new files.
- Embed evidence strings directly in status cells (live values, not promises).
- Pause at each milestone boundary; proceed on explicit approval only.
