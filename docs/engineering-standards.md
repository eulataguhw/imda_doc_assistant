# Engineering Standards — Doc Assistant

Standards for this application only; they do not override host instructions or explicit user direction.

## TypeScript (both apps)
- `strict: true` everywhere; no `any` without a comment justifying it.
- TypeScript 7.0.2 (native compiler); configs avoid flags removed in TS 6/7 — the API uses explicit `"rootDir": "src"` and no `baseUrl`.

## API (NestJS)
- One module per domain: `<domain>.module.ts` + controller + service; registered in `app.module.ts`.
- Global prefix `/api`; routes are lowercase kebab-case resources (`/api/documents`, `/api/chat/stream`).
- Error responses: HTTP status + JSON body `{ "error": "<message>" }`.
- SSE frame schema (fixed contract — API `chat` spec): one `{"type":"citation","documentId":"<id>"}` per requested document → N× `{"type":"chunk","delta":"<text>"}` → `{"type":"done"}`, each frame terminated by a blank line.
- Body validation at the controller edge; invalid bodies return 400 before any streaming starts.

## Web (React SPA)
- Function components only; no class components, no CSS-in-JS.
- Client-side routing via react-router v8; theming via `next-themes` with `attribute="class"` (dark = `.dark` on `<html>`).
- Styling: Tailwind v4 utilities + oklch design tokens defined in `src/styles/globals.css`; components consume the CSS custom properties.

## Dependencies
- Latest stable versions, verified against the npm registry (`npm view <pkg> version`) before pinning; carets at the verified major.

## Verification requirements
- API changes: workspace build passes **and** affected endpoints are exercised with live `curl` (status + frames quoted in the change record).
- Web changes: `tsc` typecheck + `vite build` pass; runtime claims require a browser check — otherwise labeled "build-verified only".

## Git discipline
- No commits, pushes, merges, or destructive actions without explicit user approval per action.
