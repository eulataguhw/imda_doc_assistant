# Development Plan — api/documents

- **Deliverable:** document library endpoint with stable DTO contract, plus the M4 upload/ingestion pipeline.
- **Order:** module → service (list) → controller (route + DTO). M1 delivered the stub; M4 adds `upload()` in the service, `POST` route, and the `ingest.ts` pipeline (chunk → Ollama embed → Qdrant upsert).
- **Validation:** live `curl` of `GET /api/documents`; M4: upload flow verified end-to-end — happy path to `ready`, failure path to `error` + reason, Qdrant points present, enum sync across all 5 surfaces.
- **Rollout/recovery:** M4 depends on `lib` schema (`error_reason` migration) and local Ollama/Qdrant (docker images available); recovery = row stays `error` with the reason, re-upload retries.
- **Status:** M1 stub complete + verified 2026-10-22; M4 in progress (spec gate complete 2026-10-25).
