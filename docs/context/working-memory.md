# Working Memory — Doc Assistant

- **Updated:** 2026-10-26 (Tech-challenge gap-closure complete + verified + committed to `feat/web-ui`)
- **Goal status:** Gap-closure DONE. All five required groups closed; every gate green. Committed as `c6e8817` (gap closure) + `d58ae51` (`/api/health`) on top of the M4–M8 refactor commit `272725d`. Not pushed (push only on request).

## Current state

- **Gap-closure pass complete (2026-10-26):** Closed all five challenge gap groups against "AI-Powered Document Assistant | Frontend Engineer (Gen AI) v1.0".
  - **Docs:** README rewritten + `ARCHITECTURE.md`, `DESIGN.md`, `TESTING.md`, `INNOVATION_ASSESSMENT.md` authored; claims verified against source (coverage floors, SSE contract, tokens).
  - **Testing:** 7 API test files added → **83 tests** (13 files); coverage enforced ≥80% on all four metrics in BOTH apps — web aggregate 90.5/81.91/82.52/90.5, api 92.88/84.3/98.07/92.88. Snapshot + jest-axe deps present but not yet wired (documented as a known gap in TESTING.md).
  - **DevOps:** `Dockerfile` + `docker-compose.yml`, GitHub Actions CI (lint + typecheck + test + both coverage gates), eslint + prettier configs, `.env.example`; added `GET /api/health` liveness endpoint so the compose healthcheck works (was polling a non-existent route) — live-verified HTTP 200.
  - **Architecture:** React.lazy/Suspense code-splitting per page + `RouteFallback`; global state lifted to shared Zustand stores (`useSessionsStore`, `useDocumentsStore` with origin filtering via `selectByOrigin`) — single source of truth surviving route changes.
  - **UI/a11y:** streaming cursor + message fade-in (reduced-motion safe), skip link, responsive nav wrap, `<main id="main">` landmark, WCAG AA contrast tokens.
  - **Gates green:** lint 0/0 · web+api strict `tsc` clean · unit tests api 83/83 + web 69/69 · coverage ≥80% all four metrics both apps · Playwright E2E 5/5 (local-LLM streaming timeouts raised — CPU reasoning model ~100s+/completion, not a frontend defect).
- Monorepo at `doc-assistant/`: `apps/api` (NestJS, :3001) + `apps/web` (React SPA, builds; dev proxy :5173 → :3001) + `data/doc-assistant.db` (node:sqlite). Backends: Ollama :11434 (nomic-embed-text), llama.cpp :8888 (`Qwen3.8-27B-Uncensored`, thinking model), Qdrant :6333 (collection `documents`).

- Monorepo at `doc-assistant/`: `apps/api` (NestJS, :3001) + `apps/web` (React SPA, builds; dev proxy :5173 → :3001) + `data/doc-assistant.db` (node:sqlite). Backends: Ollama :11434 (nomic-embed-text), llama.cpp :8888 (`Qwen3.8-27B-Uncensored`, thinking model), Qdrant :6333 (collection `documents`).
- **M8 implemented + verified (2026-10-26):** v3-M5 feature set — conversation history, selectable "Scoped to", real markdown + inline citation chips, in-chat drag-drop direct upload (parse → full text to LLM, no RAG), Knowledge/Library split, document deletion, and a unit+E2E harness. Schema: `documents.origin` (`knowledge`|`chat`) + nullable `content`; new `sessions`/`messages` tables. API: `POST /chat/documents`, `GET/POST /chat/sessions[/:id]`, `DELETE /documents/:id` (+Qdrant points for knowledge), origin filter, direct-mode prompt (one `citation` per attached doc). Web: ChatPage flagship (react-markdown+remark-gfm, `[n]`→chip → `/documents/:id`, scoped picker, composer dropzone, new/revisit history); Knowledge (renamed Library, keeps upload) + new Library (chat-only, no upload). **Gates green:** root build exit 0 · API vitest 18/18 · web vitest 20/20 · Playwright E2E 5/5 (26.2s) vs live stack. New deps: api `vitest`; web `react-markdown`,`remark-gfm` + devDeps `vitest`,`jsdom`,`@testing-library/*`,`@playwright/test`.
- **M7 implemented + verified headlessly (2026-10-25):** v3-M4 _Polish & a11y_. Web-only. Empty/loading/error states (Library `SkeletonRows` + `role="alert"` error w/ Retry; Chat `aria-live="polite"` streaming region), micro-interactions (send disabled, focus return — verified from M6), and WCAG 2.1 AA: theme-aware `--focus-ring` + global `:focus-visible`, `prefers-reduced-motion` guard (CSS-only), and a contrast pass that surfaced the hidden failure class — `foreground`+opacity muted text (0.4–0.6) fails dark-theme AA → replaced by a real `--text-secondary` token across Library/DocumentDetail/Chat; dark `--accent` raised, solid-badge text via `--badge-solid-text`, Toaster dismiss icon 60→85%. A **second pass** caught the same idiom as _Tailwind opacity classes_ (missed by the inline-style grep): `AppShell` inactive nav links (2.35:1 dark) and `ChatPage` "Scoped to:" label (3.51:1 dark) → `[color:var(--text-secondary)]`; theme-toggle icon left at 70% (non-text, passes 3:1). Web build exit 0; tokens/rules confirmed in the emitted bundle. No new deps.
- **M6 implemented + verified live (2026-10-25):** real RAG chat — `POST /api/chat/stream` retrieves top-k from Qdrant (global or scoped to `documentIds`), assembles a context-grounded prompt with ≤6-message client-sent history, streams LLM deltas over the frozen flat SSE contract (`citation`* → `chunk`* → `done` | `error`); pre-first-byte failure → JSON 502; validation → 400. ChatPage consumes the real stream (fakes deleted), citation chips link `/documents/:id`. Ingest now stores LLM summary (best-effort: failure → warn + continue, row `ready`) plus real `pages`/`size_bytes`; DocumentDetailPage shows them (docMeta fallback only for legacy rows). All acceptance criteria exercised — evidence table in the authoritative record.
- **M5 verified live (2026-10-25):** multipart upload → extraction (pdfjs/mammoth) → queue → `ready`; Qdrant points carry extracted text; all rejection paths correct; provider switch proven via mock endpoint.
- **M4 verified live (2026-10-25):** ingest pipeline happy path + Ollama-down error labeling + 400s.
- **Env note:** `apps/api/.env` was created by the user (inline env vars used for test boots; real process env overrides `--env-file`). CC Safety Net still blocks bash touching `.env` basenames.

## Decisions (M6–M7, recorded)

| Decision                                                                             | Rationale                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Muted text → real `--text-secondary` token (not per-site opacity)                    | The `foreground`+opacity idiom hid the effective color behind a blend and failed dark-theme AA in ~15 places; one theme-aware token is the smallest correct fix and keeps the contrast story auditable |
| Contrast pass must grep BOTH inline `style` opacity AND Tailwind `opacity-*` classes | The first (inline-style) grep missed `AppShell` nav links + `ChatPage` "Scoped to:" label, both dark AA fails; a class-wide `opacity` sweep caught them. Two distinct syntaxes encode the same idiom   |
| Focus ring = CSS custom property + global `:focus-visible`                           | One place, theme-aware, no per-component duplication; WCAG 2.4.7 satisfied uniformly                                                                                                                   |
| Reduced motion via CSS `@media (prefers-reduced-motion)` only                        | No JS matchMedia needed for this scope; PONYTAIL marker documents the ceiling/upgrade trigger                                                                                                          |
| Skeletons presentational (`aria-hidden` + single sr-only label)                      | AT gets one "loading" announcement, not N skeleton-node announcements                                                                                                                                  |
| Chunking stays paragraph-boundary packing                                            | Semantic chunking costs an extra embedding pass for marginal gain at this corpus size; PONYTAIL marker documents upgrade trigger                                                                       |
| Summary is best-effort (warn + continue)                                             | A failing chat model must not block the working embedding pipeline                                                                                                                                     |
| SSE contract frozen flat; client maps to nested events at parse boundary             | M3 shipped it; only payloads became real (`citation` gains `page?`/`score`)                                                                                                                            |
| History ≤6, client-sent, no server persistence                                       | PONYTAIL: persistence is a later milestone (trigger: user asks to reload past chats)                                                                                                                   |
| `with_payload: true` on Qdrant search                                                | This Qdrant build omits payloads from `/points/search` hits otherwise                                                                                                                                  |

## Risks / open items

- Web views verified by code + built bundle + proxy round-trips; live click-through left to the user (no browser tooling).
- API DB path is cwd-relative (`../../data/doc-assistant.db`) — boot from `apps/api/`.
- Qwen3.8-27B-Uncensored streams `reasoning_content` before `content`; keep `LLM_MAX_TOKENS` ≥ 1024 or the reasoning phase can consume the whole budget (empty `content`, `finish_reason: length`).
- Groq/Cerebras subagent routes were unavailable mid-run (both died); lead executed locally under the same plan — no quality deviation recorded.

## Next action

1. Gap-closure is committed to `feat/web-ui` (`c6e8817`, `d58ae51`). Push on explicit request only.
2. Optional polish (not required, not done): wire the already-present snapshot + jest-axe deps into a web suite; add a document-comparison view or highlighted-PDF scroll-to-citation (challenge bonus items).
3. Any new milestone starts from this boundary.

## Links

[Docs index](../README.md) · [Development plan](../development-plan.md) · [Master plan](../plan.md) · [M8 change record (authoritative)](../spec/_cross-cutting/m8-chat-experience.md) · [M7 change record (authoritative)](../spec/_cross-cutting/m7-polish-a11y.md) · [M6 change record (authoritative)](../spec/_cross-cutting/m6-rag-chat.md) · [Spec index](../spec/README.md)
