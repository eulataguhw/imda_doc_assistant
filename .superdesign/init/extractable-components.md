# Extractable Components — doc-assistant (apps/web)

Layout/shell components worth extracting as reusable canvas components (focus layout components first; skip basic primitives like Button/Input/Badge — those stay inline in drafts).

## AppShell / TopNav

- **Name**: `AppShell` (top navigation + page frame)
- **File path**: `apps/web/src/App.tsx`
- **Category**: layout / shell
- **Description**: The app-wide chrome: 3rem top bar with the "DocAssist" brand wordmark, two nav links (Library `/library`, Chat `/chat`) with active-state opacity styling, and a theme toggle button (Moon icon, flips light/dark via `next-themes`). Below it, a centered `max-w-4xl` content column where routed pages render. This is the single shared layout every screen sits inside.
- **Key props / behavior**: no explicit props — derives active state from the route (`NavLink`), theme from context (`useTheme()`). For canvas extraction, model as: `activeItem: "library" | "chat"` (string, default `"library"`), `theme: "light" | "dark"` (default `"light"`), brand text `"DocAssist"` fixed.
- **Source**: full JSX in `layouts.md`.

## Not extracted (primitives — inline in drafts)

- `StatusBadge` (`apps/web/src/components/StatusBadge.tsx`) — small semantic pill (ready/processing/error); simple enough to render inline in each draft rather than as a saved component.
- No other shared primitives exist yet (no Button/Input/Card components in the codebase).
