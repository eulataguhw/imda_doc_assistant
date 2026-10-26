# Design System Documentation

Doc Assistant is built with a cohesive, accessible, and themeable design system engineered for readability and high-density knowledge synthesis. The visual language uses **oklch colour tokens**, a modular typography scale, consistent 4px-grid spacing, and WCAG 2.1 AA accessibility standards.

---

## 1. Colour Tokens (oklch Palette)

All colors are declared as CSS custom properties in [`apps/web/src/styles/globals.css`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/styles/globals.css) for `:root` (light) and `html.dark` (dark). We use the **oklch** color space to maintain uniform perceptual lightness and chroma shifts across theme transitions.

| Token                | Light Value              | Dark Value              | Purpose & Contrast Ratio                                                 |
| :------------------- | :----------------------- | :---------------------- | :----------------------------------------------------------------------- |
| `--background`       | `oklch(0.985 0.002 247)` | `oklch(0.14 0.015 260)` | Main canvas canvas background                                            |
| `--foreground`       | `oklch(0.18 0.02 260)`   | `oklch(0.96 0.005 250)` | Primary body copy (14.2:1 against background)                            |
| `--muted`            | `oklch(0.94 0.006 250)`  | `oklch(0.24 0.015 260)` | Card borders, subtle divider lines, code blocks                          |
| `--accent`           | `oklch(0.55 0.22 264)`   | `oklch(0.68 0.20 264)`  | Primary buttons, active nav, focus rings, stream cursor (AA-passing)     |
| `--text-secondary`   | `oklch(0.48 0.02 260)`   | `oklch(0.72 0.015 260)` | Secondary metadata, inactive links, timestamp labels (>= 4.6:1 contrast) |
| `--ready`            | `oklch(0.62 0.17 145)`   | `oklch(0.72 0.16 145)`  | Ingestion complete, successful operation indicator                       |
| `--processing`       | `oklch(0.75 0.15 75)`    | `oklch(0.82 0.14 75)`   | File uploading, text chunking, vector indexing in flight                 |
| `--error`            | `oklch(0.58 0.22 25)`    | `oklch(0.70 0.20 25)`   | Ingestion failed, network timeout, rate-limit warnings                   |
| `--badge-solid-text` | `#ffffff`                | `oklch(0.14 0.015 260)` | Guaranteed legible text on solid status badge fills                      |
| `--focus-ring`       | `var(--accent)`          | `var(--accent)`         | High-visibility focus indicator                                          |

### Persistent Dark / Light Theming

Theming is powered by `next-themes` using the `class` strategy. Toggling flips the `html.dark` CSS class, which re-skins every component instantly through token substitution. The theme preference is persisted to `localStorage` and respects the operating system's `prefers-color-scheme`.

---

## 2. Typography Scale

Typography is anchored on a modern system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) optimized for legible, high-density document reading.

| Role                 | Class Names                                         | Size            | Weight | Line Height | Usage                                                 |
| :------------------- | :-------------------------------------------------- | :-------------- | :----- | :---------- | :---------------------------------------------------- |
| **Display / H1**     | `text-3xl font-semibold tracking-tight`             | 30px (1.875rem) | 600    | 1.25        | Document Detail title, primary page header            |
| **Section / H2**     | `text-2xl font-semibold tracking-tight`             | 24px (1.500rem) | 600    | 1.30        | "How can I help you today?", Library header           |
| **Subheading / H3**  | `text-base font-semibold`                           | 16px (1.000rem) | 600    | 1.40        | Card titles, modal headers, navigation wordmark       |
| **Overline Label**   | `text-xs font-semibold uppercase tracking-wider`    | 12px (0.750rem) | 600    | 1.00        | Group headers ("READY", "PROCESSING", "ERRORS")       |
| **Body (Default)**   | `text-sm leading-relaxed`                           | 14px (0.875rem) | 400    | 1.625       | Chat transcripts, extracted preview text              |
| **Caption / Meta**   | `text-xs`                                           | 12px (0.750rem) | 400    | 1.40        | File size, page counts, upload timestamps             |
| **Micro Notice**     | `text-[10px] font-medium uppercase tracking-widest` | 10px (0.625rem) | 500    | 1.20        | "DocAssist can make mistakes. Verify important info." |
| **Monospace / Code** | `font-mono text-xs`                                 | 12px (0.750rem) | 400    | 1.50        | Document IDs, citation bracket markers, code spans    |

---

## 3. Spacing Scale & Spatial System

The spatial system follows an **8pt modular grid** with 4pt half-steps for compact control alignment.

| Token               | Pixels      | Application                                                 |
| :------------------ | :---------- | :---------------------------------------------------------- |
| `p-1` / `gap-1`     | 4px         | Citation chip icon spacing, dismiss button padding          |
| `p-1.5` / `gap-1.5` | 6px         | Top navigation links, attachment removal button             |
| `p-2` / `gap-2`     | 8px         | Composer action buttons, suggestions pill gap               |
| `p-3` / `gap-3`     | 12px        | Message bubble horizontal padding, card file icons          |
| `p-4` / `gap-4`     | 16px        | Standard card padding (mobile), alert banners               |
| `p-5` / `gap-5`     | 20px        | Document card containers (desktop), dropzone padding        |
| `p-6` / `gap-6`     | 24px        | Main page container gutters, document detail header spacing |
| `mb-10` / `mb-12`   | 40px / 48px | Section separation, empty-state hero spacing                |

### Layout Containers

- **Main Viewport Constraint:** `max-w-4xl` (896px) centered with `mx-auto` provides optimal line length (~75–80 characters) for conversational synthesis and reading comprehension.
- **Card Grids:** Responsive auto-reflow switching from single-column on mobile (`grid-cols-1`) to dual-column on tablet and desktop (`md:grid-cols-2`).

---

## 4. Component Variants

### 4.1 StatusBadge

The single source of truth for file ingestion lifecycle states:

- **`variant="solid"`** (Used in Library and Knowledge lists):
  - `ready`: Solid green background (`var(--ready)`), white text (`var(--badge-solid-text)`).
  - `processing`: Amber background (`var(--processing)`), dark text.
  - `error`: Crimson background (`var(--error)`), white text.
- **`variant="soft"`** (Used in Document Detail header):
  - Subtle tinted background (`opacity-15`), high-contrast colored text for inline metadata blocks.

### 4.2 Action Buttons

- **Primary Action (Send / Submit):**
  - Classes: `rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50`
  - Style: `backgroundColor: var(--accent)`, `color: #ffffff`.
- **Icon Action (Attach, Delete, Theme Toggle):**
  - Classes: `rounded-md p-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed`
  - Style: `color: var(--text-secondary)`.

### 4.3 Message Bubbles

- **User Bubble:**
  - Aligned to right (`justify-end`).
  - Styling: `rounded-2xl rounded-tr-none px-4 py-3 leading-relaxed shadow-sm`.
  - Style: `backgroundColor: var(--accent)`, `color: #ffffff`.
- **Assistant Turn:**
  - Aligned to left with avatar (`flex items-start gap-3`).
  - Styling: Rich Markdown rendering with code blocks, blockquotes, and inline clickable citation chips.

### 4.4 Citation Chips & Sources List

- **Inline Citation Chips (within Markdown):**
  - Syntactically rewritten from `[n]` bracket markers in model output into interactive links.
  - Classes: `mx-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 align-middle text-[11px] font-semibold transition-opacity hover:opacity-75`.
  - Style: `backgroundColor: var(--muted)`, `color: var(--foreground)`.
  - Displays document title and page: e.g. `[PolicyBrief.pdf · p.4]`.
- **Dedicated Sources List (`CitationSourcesList`):**
  - Rendered immediately when SSE `citation` events arrive prior to token streaming (showing grounding sources alongside the typing indicator).
  - Persisted below completed assistant turns as a deduplicated pill row, ensuring sources and page numbers are always accessible and clickable even if model generation omits inline brackets.

---

## 5. Accessibility (WCAG 2.1 Level AA)

1. **Bypass Landmark (WCAG 2.4.1):**
   - Skip link rendered as the very first DOM element in `AppShell`: `<a href="#main" class="skip-link">Skip to content</a>`. Jumps focus directly to `<main id="main">`.
2. **Keyboard Operability (WCAG 2.1.1):**
   - All interactive controls reachable via `Tab` / `Shift+Tab`.
   - Textarea composer supports `Enter` to submit and `Shift+Enter` for multiline input.
   - Dedicated focus ring: `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }`.
3. **Live Regions & Assistive Technology (WCAG 4.1.3):**
   - Streaming updates are announced politely through an off-screen `aria-live="polite"` region, preventing screen reader stutter while maintaining situational awareness.
   - Transient notifications render into `Toaster` with `role="status"` and `aria-live="polite"`.
4. **Color Contrast Verification (WCAG 1.4.3):**
   - Primary text (`--foreground`) achieves >= 14:1 against canvas.
   - Secondary text (`--text-secondary`) achieves >= 4.6:1 against canvas in both light and dark modes.

---

## 6. Micro-Interactions & Reduced-Motion Safety

All animations communicate state and gracefully degrade under `@media (prefers-reduced-motion: reduce)`:

- **Thinking Indicator (`.sd-typing-dot`):** Three staggered pulse dots signaling upstream LLM time-to-first-token.
- **Streaming Cursor (`.sd-stream-cursor`):** Accent-colored blinking caret rendered dynamically at the tail of arriving tokens.
- **Message Entrance (`.sd-msg-enter`):** Subtle 220ms fade-up entrance keyed per turn to avoid re-animating historical messages.
- **Motion Safety:** Under reduced motion preferences, animations immediately freeze at full opacity, removing all motion effects while preserving complete visual information.
