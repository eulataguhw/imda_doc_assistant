# Components — doc-assistant (apps/web)

## Framework & component-library detection

- **Framework**: React 19.3.1, SPA via Vite 8.3.5 (`@vitejs/plugin-react`) — no meta-framework (no Next/Nuxt).
- **Routing**: `react-router` v8.5.0 (`BrowserRouter` in `main.tsx`, routes in `App.tsx`).
- **CSS approach**: Tailwind CSS v4.3.3 via `@tailwindcss/vite` plugin, CSS-first config (no `tailwind.config.*`); semantic oklch tokens declared as custom properties in `src/styles/globals.css`.
- **Component library**: none in use. Installed but not yet imported by current code: `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`. Icons: `lucide-react` (Moon used by theme toggle).
- **State/theme**: `zustand` 5.0.15 installed; `next-themes` 0.4.6 with `attribute="class"`, `defaultTheme="system"`.

## Shared UI primitives

Only ONE shared component exists in the codebase.

### StatusBadge

- **File path**: `apps/web/src/components/StatusBadge.tsx`
- **Description**: Pill badge showing a document's processing status (ready / processing / error) using semantic color tokens.
- **Key props**: `status: "ready" | "processing" | "error"` (falls back to muted color for unknown values).

```tsx
import type { Document } from "../lib/api";

const STATUS_COLOR: Record<Document["status"], string> = {
  ready: "var(--ready)",
  processing: "var(--processing)",
  error: "var(--error)",
};

export function StatusBadge({ status }: { status: Document["status"] }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: STATUS_COLOR[status] ?? "var(--muted)" }}
    >
      {status}
    </span>
  );
}
```

No other shared primitives (Button, Input, Card, Dialog, etc.) exist yet — page-level markup is inline Tailwind utilities.
