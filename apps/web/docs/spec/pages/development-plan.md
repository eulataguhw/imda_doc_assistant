# Development Plan — web/pages

- **Deliverable:** the product views (Library, Document detail, Chat), stub → live across M2–M4.
- **Order:** M1 stubs (done) → Library wired to `GET /api/documents` + status badges (delivered with M3 badge work) → M4 upload control + error-reason display → Chat SSE consumer (M3).
- **Validation:** build passes each milestone; live claims require the running API plus browser verification of the exact behaviors above.
- **Rollout/recovery:** views are stateless components over API state; recovery = reload. Upload failures surface the API's `error_reason` inline.
- **Status:** M1 stubs complete (build-verified); Library list + badges live and verified with M3 (2026-10-24). M4 upload control in progress — spec gate complete 2026-10-25.
