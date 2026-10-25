# Spec Index — Doc Assistant

## Registered source roots
| Source root | Spec root |
| --- | --- |
| `apps/api/src` | [../apps/api/docs/spec/](../apps/api/docs/spec/README.md) |
| `apps/web/src` | [../apps/web/docs/spec/](../apps/web/docs/spec/README.md) |

## Ownership map — API (`apps/api/src`)
| Owned source file(s) | Owning package |
| --- | --- |
| `src/main.ts`, `src/app.module.ts` | [`_root`](_root/README.md) |
| `src/lib/env.ts`, `src/lib/db.ts` | [`lib`](lib/README.md) |
| `src/documents/documents.module.ts`, `documents.controller.ts`, `documents.service.ts`, `ingest.ts` (M4), `extract.ts`, `queue.ts` (M5) | [`documents`](documents/README.md) |
| `src/chat/chat.module.ts`, `chat.controller.ts` | [`chat`](chat/README.md) |

## Ownership map — Web (`apps/web/src`)
| Owned source file(s) | Owning package |
| --- | --- |
| `src/main.tsx`, `src/App.tsx`, `src/lib/api.ts` | [`_root`](_root/README.md) |
| `src/pages/LibraryPage.tsx`, `src/pages/ChatPage.tsx`, `src/pages/DocumentDetailPage.tsx`, `src/components/StatusBadge.tsx`, `src/components/Toaster.tsx` (M5), `src/lib/docMeta.ts` (display metadata for pages) | [`pages`](pages/README.md) |
| `src/styles/globals.css` | [`styles`](styles/README.md) |

## Conventions
- `_root` = package owning source-root-level files (entrypoint, app shell).
- `_cross-cutting/<change-id>.md` = changes spanning packages; the cross-cutting record is authoritative over per-package change notes.
- Current change id: **m6-rag-chat** — complete + verified live 2026-10-25 ([record](_cross-cutting/m6-rag-chat.md)). Prior: [m5-file-upload](_cross-cutting/m5-file-upload.md) (complete + verified live 2026-10-25), [m4-ingestion](_cross-cutting/m4-ingestion.md) (complete + verified live 2026-10-25), [m3-status-badges](_cross-cutting/m3-status-badges.md) (complete + verified 2026-10-24), [m1-scaffold](_cross-cutting/m1-scaffold.md) (2026-10-22).
