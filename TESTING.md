# Testing

Three layers, all runnable from the repo root. The guiding principle: **unit tests are deterministic and LLM-free** (external boundaries stubbed, real SQLite), while a small Playwright suite exercises the *real* upload → question flow end-to-end against a live stack.

## Layers at a glance

| Layer | Runner | Scope | Command |
| --- | --- | --- | --- |
| Unit — web | Vitest + React Testing Library (jsdom) | components, pages, lib, app shell | `npm run test -w doc-web` |
| Unit — api | Vitest (Node) | services, controllers, extraction, ingest, queue, db | `npm run test -w doc-api` |
| Coverage gates | `@vitest/coverage-v8` | both apps | `npm run test:coverage -w <app>` |
| Integration / e2e | Playwright | live upload → question flow | `npm run test:e2e` |

Run everything (unit, all workspaces) with `npm test`.

## Unit tests — web (`apps/web/src`)

Vitest 3 + jsdom, React Testing Library for rendering, `@testing-library/jest-dom` matchers. Real suites present:

- **App shell / routing:** `App.test.tsx`
- **Components:** `AppShell`, `Markdown`, `StatusBadge`, `Toaster` (one suite each)
- **Library logic:** `lib/api.test.ts` (API client + streaming parser), `lib/docMeta.test.ts`, `lib/markdown.test.ts`
- **Pages:** `ChatPage`, `KnowledgePage`, `LibraryPage`, `DocumentDetailPage` (one suite each)

**Mocking strategy — LLM-free and deterministic:** the API boundary is a stubbed `fetch`, so no network, no Qdrant, no model. Components render against fixture data; streaming assertions drive the parser with canned SSE frames rather than a live connection. Tests assert on accessible names/roles (not brittle markup), which keeps them aligned with the accessibility contract in [DESIGN.md](DESIGN.md).

## Unit tests — api (`apps/api/src`)

Vitest in Node. Real suites present:

- **Chat:** `chat.controller.test.ts`, `chat.service.rag.test.ts` (retrieval + prompt construction), `chat.service.test.ts`, `sessions.service.test.ts`
- **Documents pipeline:** `documents.controller.test.ts`, `documents.service.flows.test.ts`, `documents.service.test.ts`, `extract.test.ts` (PDF/DOCX text extraction), `ingest.test.ts` (chunk/embed/upsert boundary), `queue.test.ts` (background indexing)
- **Infra:** `lib/env.test.ts` (config contract), `lib/db-migration.test.ts` (schema + guarded migration)

**Mocking strategy — real DB, stubbed external services:** each test gets an isolated SQLite file (`vitest.setup.ts` points `DATABASE_PATH` at a fresh temp dir *before* the module graph loads), so persistence behavior is exercised for real. The LLM and Qdrant boundaries are mocked (stubbed `fetch` / `vi.mock('./ingest')`), so tests never depend on a model server or vector store being up — they run identically in CI and locally.

## Coverage gates (both apps)

Enforced by **`@vitest/coverage-v8`** with identical floors in both apps — **≥ 80 % on statements, branches, functions, and lines**:

- `apps/web/vitest.config.ts` — thresholds 80 across all four metrics; coverage includes `src/**/*.{ts,tsx}`, excluding test files and `src/main.tsx`.
- `apps/api/vitest.config.ts` — thresholds 80 across all four metrics; includes `src/**/*.ts`, excluding `**/*.test.ts`, `src/main.ts`, and `**/*.module.ts` (NestJS module wiring has no logic to cover).

CI runs both gates on every push: `npm run test:coverage -w doc-web` and `-w doc-api`. A PR that drops any metric below 80 % fails the build.

## Integration / end-to-end (Playwright)

A focused suite in `e2e/` drives a **live stack** — `playwright.config.ts` boots the API (against a real LLM endpoint) and the Vite dev server, then exercises the UI:

- **`library.spec.ts`** — chat-uploaded documents: asserts Library lists a chat doc, exposes *no* upload control on that view, and can remove it.
- **`knowledge.spec.ts`** — RAG documents: creates a knowledge-origin document via `POST /api/documents/upload`, asserts the upload dropzone is present, and deletes it.
- **`chat.spec.ts`** — three flows: (1) *direct* mode — attach a PDF in chat, ask, and verify an answer with an inline source citation; (2) *RAG* mode — no attachment, verify an answer is retrieved from the knowledge base and streamed; (3) *sessions* — start a conversation, then revisit it from the past-conversations list.

E2e is deliberately small: it proves the full contract (upload → index → retrieve → stream → cite → persist) works together, while unit tests own the individual behaviors. It runs with `workers: 1` and retains traces + on-failure screenshots for diagnosis.

## How to run each layer

```bash
# Unit — everything (both workspaces)
npm test

# Unit — one app
npm run test -w doc-web
npm run test -w doc-api

# Coverage gates (fail below 80% on any metric)
npm run test:coverage -w doc-web
npm run test:coverage -w doc-api

# End-to-end (boots a live stack; needs the LLM/embedding services reachable)
npm run test:e2e
```

## What is covered vs. deliberately not

**Covered:** every service, controller, extraction/ingest/queue path in the API; every component, page, and lib module in the web app; the full upload→question contract end-to-end.

**Deliberately not wired into the default run (honest gaps):**

- **Snapshot / visual-regression tests** — none are part of the suite. We favor behavioral assertions over pixel snapshots because the design system is token-driven and stable; adding snapshot churn without a committed baseline would add noise more than signal.
- **jest-axe accessibility suite** — `jest-axe` is present as a dev dependency but is not yet wired into a suite. Accessibility is instead asserted structurally (roles, labels, live regions) in the component tests and by the e2e flows; a dedicated axe pass is a planned addition, not a current gate.
- **Dedicated unit suites for `hooks/useChatStream`, `hooks/useDocuments`, and the Zustand stores** — these are exercised indirectly through their page-level suites (which render and drive them) rather than in isolation. The streaming parser itself *is* covered directly in `lib/api.test.ts`.

These gaps are tracked as follow-ups; the coverage floors above remain the hard gate regardless.
