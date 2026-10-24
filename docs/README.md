# Doc Assistant — Docs Index

| Document | Purpose |
| --- | --- |
| [project-context.md](project-context.md) | What this app is: goals, constraints, verified stack |
| [engineering-standards.md](engineering-standards.md) | Coding and API/SPA conventions for this application |
| [development-plan.md](development-plan.md) | Master milestone plan M1–M6 with exit criteria and status |
| [context/working-memory.md](context/working-memory.md) | Living state: decisions, assumptions, next actions |

## Spec roots (mirror each app's `src/`)

- API: [apps/api/docs/spec/README.md](../apps/api/docs/spec/README.md) — packages `_root`, `lib`, `documents`, `chat`
- Web: [apps/web/docs/spec/README.md](../apps/web/docs/spec/README.md) — packages `_root`, `pages`, `styles`
- Cross-component changes: [spec/_cross-cutting/](spec/_cross-cutting/)

Rule: every source file is owned by exactly one spec package; each spec index carries the ownership map.
