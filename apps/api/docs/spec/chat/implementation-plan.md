# Implementation Plan — api/chat

## Design delta (M1)
Controller validates the body at the edge (400 + `{error}` before streaming), sets `text/event-stream`, then writes frames in contract order with blank-line terminators. Stub deltas stand in for M3's LLM stream.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/chat/chat.module.ts` | create | module registration |
| `apps/api/src/chat/chat.controller.ts` | create | POST /api/chat/stream + validation + frame emission |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| API-CHAT-1 | frame emitter order | raw curl capture (verified, quoted below) |
| API-CHAT-2 | edge validation | 400 + JSON error (verified) |
| API-CHAT-3 | M3 scope | — |

## Commands
    npm run build -w doc-api
    curl -N -X POST http://localhost:3001/api/chat/stream \
      -H 'content-type: application/json' \
      -d '{"question":"what is this?","documentIds":["doc-abc"]}'

## Deviations
None.
