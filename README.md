# Doc Assistant

AI-powered document assistant: upload PDFs, ask questions, get answers streamed token-by-token with citations to source documents and pages.

## Structure

| Path | Purpose |
| --- | --- |
| `apps/api` | NestJS service — REST for library state, SSE stream endpoint for chat answers (`/api`) |
| `apps/web` | React 19 SPA — Library + Chat views, Tailwind v4 oklch tokens, dark/light via CSS class |
| `data/` | SQLite file (document metadata) |

## Run

```bash
npm install        # once, at repo root (installs all workspaces)
npm run build      # typechecks + bundles both apps
npm run dev:api    # API on :3001 (global prefix /api)
npm run dev:web    # SPA on :5173, proxies /api -> :3001
```

## Milestones

M1 scaffold (this tree) · M2 ingestion/upload · M3 streaming + citations · M4 polish · M6 Docker/CI/docs

## Docs

Project docs and specs live in [docs/](docs/README.md) — project context, engineering standards, development plan, working memory, and the spec index. Per-app specs mirror each `src/`:

- API: [apps/api/docs/spec/](apps/api/docs/spec/README.md)
- Web: [apps/web/docs/spec/](apps/web/docs/spec/README.md)
