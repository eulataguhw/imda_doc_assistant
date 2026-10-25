# Implementation Plan — api/documents

## Design delta (M1)
Standard NestJS trio. `DocumentsService.list()` returns `[]` (honest stub); controller exposes `GET /api/documents` with the DocumentDto shape that M2 will populate from SQLite.

## File operations (M1, all create)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/documents/documents.module.ts` | create | module registration |
| `apps/api/src/documents/documents.controller.ts` | create | GET route + DTO |
| `apps/api/src/documents/documents.service.ts` | create | list() stub |

## Requirement → step mapping
| Req (PRD) | Step | Check |
| --- | --- | --- |
| API-DOC-1 | controller GET handler | live curl → 200 + `[]` (verified) |
| API-DOC-2 | DTO typing vs DDL | source inspection against `sqlite_master` DDL |
| API-DOC-3 | M4: upload() + POST route + ingest pipeline | see M4 mapping below |

## Commands
    npm run build -w doc-api && curl http://localhost:3001/api/documents

## Deviations
None.

---

## M4 — ingestion/upload (spec gate 2026-10-25)

### Design delta
- `POST /api/documents` accepts JSON `{title, content}`; 400 on missing/non-string fields; 201 + final DTO. Transport chosen at the gate: no new deps (no multer/pdfjs in tree).
- `ingest.ts` (new, owned by this package): `chunkText()` paragraph-aware ~500-char chunks (PONYTAIL marker); `embedChunks()` via Ollama OpenAI-compatible `${config.llmBaseUrl}/embeddings` with `config.embedModel`; `upsertPoints()` ensures Qdrant collection `documents` exists and upserts UUID points, payload `{document_id, title, chunk_index, text}`. Plain global `fetch` (Node 24), no SDK.
- Service `upload()`: insert row `processing` (uuid) → ingest → update `ready`; on failure update `error` + `error_reason` (message). Synchronous in-request; PONYTAIL: ceiling ~50 KB text, upgrade to a job queue when uploads grow.
- DTO gains optional `errorReason?: string | null`; **status union unchanged** — enum-sync invariant preserved.

### File operations (M4)
| Path | Op | Reason |
| --- | --- | --- |
| `apps/api/src/documents/ingest.ts` | create | chunk + embed + upsert pipeline |
| `apps/api/src/documents/documents.service.ts` | modify | `upload()` lifecycle; `list()` maps `error_reason`; DTO field |
| `apps/api/src/documents/documents.controller.ts` | modify | `POST /api/documents` + validation |

### Requirement → step mapping (M4)
| Req | Step | Check |
| --- | --- | --- |
| API-DOC-3 / API-M4-1 | service.upload() happy path | curl POST → 201 `ready`; list reflects it |
| API-M4-2 | failure path (services down) | curl POST → row `error` + non-empty reason; enum diff across 5 surfaces = identical |
| API-M4-3 | upsertPoints() | Qdrant REST: points exist, payload.document_id matches |

### Commands
    npm run build -w doc-api
    cd apps/api && node dist/main.js &
    curl -s -X POST localhost:3001/api/documents -H 'content-type: application/json' \
      -d '{"title":"M4 sample","content":"…"}'
    curl -s localhost:6333/collections/documents/points?limit=5

## Deviations (M4)
Upload was PRD-labeled "M2"; delivered in M4 with JSON text transport — recorded in the authoritative [m4-ingestion](../../../../../../docs/spec/_cross-cutting/m4-ingestion.md) scope decision.
