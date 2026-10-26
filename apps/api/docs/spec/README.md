# Spec Index — doc-api (`apps/api/src`)

| Package                            | Owns                               | Purpose                                       |
| ---------------------------------- | ---------------------------------- | --------------------------------------------- |
| [`_root`](_root/README.md)         | `src/main.ts`, `src/app.module.ts` | Bootstrap, global `/api` prefix, module graph |
| [`lib`](lib/README.md)             | `src/lib/env.ts`, `src/lib/db.ts`  | Typed env config; SQLite documents table      |
| [`documents`](documents/README.md) | `src/documents/*.ts`               | Document library API (`GET /api/documents`)   |
| [`chat`](chat/README.md)           | `src/chat/*.ts`                    | `POST /api/chat/stream` SSE contract          |

Upstream: [project docs](../../../docs/README.md) · [spec root index](../../../docs/spec/README.md) · authoritative M1 record: [m1-scaffold](../../../docs/spec/_cross-cutting/m1-scaffold.md)
