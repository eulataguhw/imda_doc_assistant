# Theme — doc-assistant (apps/web)

## Part 1: Compact token summary (use these values for drafts)

### Color tokens (oklch, semantic)

| Token          | Light (`:root`)         | Dark (`.dark`)          | Used for                                                      |
| -------------- | ----------------------- | ----------------------- | ------------------------------------------------------------- |
| `--background` | `oklch(0.985 0.004 90)` | `oklch(0.19 0.008 280)` | App background (warm off-white / deep indigo-black)           |
| `--foreground` | `oklch(0.21 0.01 70)`   | `oklch(0.93 0.005 80)`  | Primary text                                                  |
| `--muted`      | `oklch(0.94 0.006 80)`  | `oklch(0.26 0.008 280)` | Borders, loading text, row dividers, fallback badge bg        |
| `--accent`     | `oklch(0.62 0.21 275)`  | `oklch(0.72 0.18 280)`  | Indigo accent: back links, active hints, interactive emphasis |
| `--ready`      | `oklch(0.62 0.15 155)`  | `oklch(0.74 0.14 155)`  | Status pill "ready" (green)                                   |
| `--processing` | `oklch(0.72 0.14 80)`   | `oklch(0.80 0.13 80)`   | Status pill "processing" (amber)                              |
| `--error`      | `oklch(0.60 0.19 25)`   | `oklch(0.71 0.16 25)`   | Status pill "error" + error text (red)                        |

### Typography

- No custom font is loaded — Tailwind v4 default sans stack applies.
- Scale in use: `text-xs` (status pills), `text-sm` (nav links, buttons); headings via `<h1>` at browser default size.
- Brand wordmark: `font-semibold tracking-tight`.

### Spacing & radius (observed usage)

- Nav link: `rounded-md px-3 py-1.5`; icon button: `rounded-md px-2 py-1`.
- Status pill: `rounded-full px-2.5 py-0.5 inline-flex items-center`.
- Page padding: `p-6`; content column: `mx-auto max-w-4xl`; page fill height: `min-h-[calc(100vh-3rem)]` (nav is 3rem / `h-12`).

### Theme switching

- `next-themes` with `attribute="class"`, `defaultTheme="system"`; toggle button in the nav flips resolved light/dark. Dark mode = `.dark` class on `<html>`.

## Part 2: Raw source

### Tailwind config

Tailwind CSS v4.3.3, CSS-first configuration via `@tailwindcss/vite` — **no `tailwind.config.ts/js` exists**. Theme values are plain custom properties in `globals.css`, referenced by components through `var(--token)` (inline styles) and utility classes.

### `apps/web/src/styles/globals.css` (full, 20 lines)

```css
@import "tailwindcss";

:root {
  --background: oklch(0.985 0.004 90);
  --foreground: oklch(0.21 0.01 70);
  --muted: oklch(0.94 0.006 80);
  --accent: oklch(0.62 0.21 275);
  --ready: oklch(0.62 0.15 155);
  --processing: oklch(0.72 0.14 80);
  --error: oklch(0.6 0.19 25);
}

html.dark {
  --background: oklch(0.19 0.008 280);
  --foreground: oklch(0.93 0.005 80);
  --muted: oklch(0.26 0.008 280);
  --accent: oklch(0.72 0.18 280);
  --ready: oklch(0.74 0.14 155);
  --processing: oklch(0.8 0.13 80);
  --error: oklch(0.71 0.16 25);
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```
