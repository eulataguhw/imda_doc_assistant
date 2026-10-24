# Development Plan — api/documents

- **Deliverable:** document library endpoint with stable DTO contract.
- **Order:** module → service (list) → controller (route + DTO). M1 delivered the stub; M2 adds upload + persistence reads.
- **Validation:** live `curl` of `GET /api/documents`; M2: upload flow verified end-to-end (row state transitions observable via the list endpoint).
- **Rollout/recovery:** stateless controller/service in M1; M2 depends on `lib` schema (already in place).
- **Status:** M1 stub complete + verified 2026-10-22.
