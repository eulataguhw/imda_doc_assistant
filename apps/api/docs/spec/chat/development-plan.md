# Development Plan — api/chat

- **Deliverable:** the fixed SSE contract endpoint, stub-bodied in M1, RAG-bodied in M3.
- **Order:** validation → frame emitter (citation per id → chunks → done). M1 delivered; M3 swaps the body pipeline behind the same contract.
- **Validation:** live `curl -N` capturing raw frames; malformed-body 400 check. Both verified 2026-10-22.
- **Rollout/recovery:** stateless in M1; M3 adds retrieval dependencies (Qdrant + LLM) without touching the frame contract.
- **Status:** M1 stub complete + verified 2026-10-22.
