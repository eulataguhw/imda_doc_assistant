# Design

The frontend is a single-page React app with one shared shell and four routed views. This document describes the design system, component architecture, accessibility approach, per-view state coverage, responsiveness, and animation — and is specific about **what exists today**.

## Design system: oklch tokens

All color is driven by CSS custom properties defined in `apps/web/src/styles/globals.css`, declared once for light (`:root`) and once for dark (`html.dark`). Tokens are expressed in **oklch** so light/dark variants share a perceptual hue/chroma relationship rather than being hand-tweaked hex pairs.

| Token | Purpose | Light (approx.) | Dark (approx.) |
| --- | --- | --- | --- |
| `--background` | Page canvas | near-white warm neutral | deep indigo-black |
| `--foreground` | Primary text | near-black | near-white |
| `--muted` | Surfaces, borders, scrollbars | light grey | dark slate |
| `--accent` | Active nav, links, focus ring, stream cursor | saturated indigo | brighter indigo |
| `--ready` / `--processing` / `--error` | Status badge semantics | green / amber / red | lighter variants for contrast on dark |
| `--text-secondary` | Inactive nav, de-emphasized text (AA-passing) | mid grey | light grey |
| `--badge-solid-text` | Text on solid status badges | white | dark |
| `--focus-ring` | Keyboard focus indicator | = `--accent` | = `--accent` |

Typography is system-stack with Tailwind utilities; spacing and radii use Tailwind's scale. Component variants (e.g. status badge states) are expressed through these tokens rather than ad-hoc values, so a new state never introduces an off-palette color.

## Theming (persisted light/dark)

Theming uses **`next-themes`** (`useTheme`) with the `class` strategy: toggling flips `html.dark`, which swaps the token set above. The choice is **persisted across sessions** (browser storage), and the toggle is a single icon button in the shell with an accessible label that reflects the *action* ("Switch to dark theme" / "Switch to light theme"). Because every color flows from tokens, switching themes re-skins the entire app — including charts of status badges, focus rings, and the stream cursor — with zero per-component changes.

## Component architecture

Presentational vs. container separation (detailed in [ARCHITECTURE.md](ARCHITECTURE.md)):

- **`AppShell`** — top navigation, skip link, theme toggle. Rendered once above routed views so it persists across navigation without remounting.
- **`Markdown`** — renders assistant output (`react-markdown` + `remark-gfm`) with scoped styles for headings, lists, code, tables, and blockquotes (`.chat-markdown`).
- **`StatusBadge`** — the single source of truth for upload/processing/ready/error visuals; every view reuses it so status language is consistent.
- **`Toaster`** — transient notices in a polite live region.
- **Container pages** (`ChatPage`, `KnowledgePage`, `LibraryPage`, `DocumentDetailPage`) own local UI state, call the hooks, and compose the presentational pieces.

Shared logic (streaming consumption, library lifecycle) lives in custom hooks, not components, so behavior is testable and reused without duplication.

## Accessibility (WCAG 2.1 AA)

Concrete, shipped controls — each traceable to source:

- **Bypass block (2.4.1):** a skip link (`<a href="#main" class="skip-link">Skip to content</a>`) in `AppShell`, off-screen until focused; the target is `<main id="main" tabIndex={-1}>`.
- **Keyboard operability:** Enter sends / Shift+Enter inserts a newline in the composer; all interactive elements are natively focusable and reachable by Tab. A **visible focus indicator** (`:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }`) is theme-aware and distinct from hover.
- **Live regions for async status:**
  - `Toaster` renders into `aria-live="polite"` with items as `role="status"`.
  - The chat view exposes an `aria-live="polite"` sr-only region announcing streaming/status changes to assistive tech while the visual shows animation.
- **Errors announced:** Knowledge and Library error states use `role="alert"`.
- **Loading placeholders are not noisy:** skeletons are `aria-hidden` with a single `sr-only` label ("Loading library documents…") so screen readers get one clean announcement instead of a flood of empty nodes.
- **Icon-only controls are labelled:** theme toggle, send, attach-file, remove-attachment, and dismiss-notification buttons all carry descriptive `aria-label`s; decorative bullets/icons use `aria-hidden`.
- **Document scope picker** (chat) is a real listbox: `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `aria-label="Scope the answer to a document"`.
- **Contrast:** token pairs are chosen so inactive nav (`--text-secondary`) and active nav (`--accent`) both pass AA against `--background`; status badge text uses `--badge-solid-text` for guaranteed legibility on solid fills.

## State coverage (empty / loading / error / success)

Every data-dependent view handles all four states, consistently:

| View | Empty | Loading | Error | Success |
| --- | --- | --- | --- | --- |
| **Knowledge** | First-time guidance: what to upload and how it's used | Skeleton (aria-hidden + sr-only label) | `role="alert"` message with retry affordance | Ready documents, scoped RAG questions |
| **Library** | "No documents yet" prompt with upload call-to-action | Skeleton | `role="alert"` with reason + retry | Document list w/ metadata + `StatusBadge` per file |
| **Chat** | "Start a conversation" / new-session affordance | Typing dots + live stream cursor while the answer arrives | Friendly inline message on the bubble (pre- or mid-stream) | Rendered Markdown answer with inline citations |
| **Document detail** | — | content preview placeholder | extraction/processing state via `StatusBadge` | metadata, page count, summary, content preview |

Optimistic UI is used where it improves perceived speed: the user's message and an empty assistant bubble appear **before** any token arrives, and a pending upload row appears as "processing" immediately after the 201 response.

## Responsiveness

The layout is fluid: containers use flexible columns (e.g. Library/Knowledge switch from single column to `md:grid-cols-2`), text reflows, and the top navigation uses `flex-wrap` so items wrap rather than overflow on narrow viewports. **Honest limitation:** there is no dedicated mobile navigation menu (hamburger/collapse) — the nav wraps instead — and no measured Lighthouse performance budget yet.

## Animation (tasteful + reduced-motion safe)

Three purposeful micro-interactions, all defined in `globals.css` and all disabled under `prefers-reduced-motion: reduce`:

- **`.sd-typing-dot`** (`@keyframes sd-typing`) — three staggered dots shown while the model is "thinking" before the first token.
- **`.sd-stream-cursor`** (`@keyframes sd-cursor-blink`) — a blinking caret (accent-colored) rendered at the tail of an assistant answer *while it is still arriving*, giving a live typing cursor without waiting for the full response.
- **`.sd-msg-enter`** (`@keyframes sd-msg-in`) — new messages fade and rise in over 220 ms, keyed per message so existing ones don't re-animate.

The route-loading fallback is deliberately a static "Loading…" node (no spinner) so it never fights `prefers-reduced-motion`. Under reduced motion the dots and cursor freeze at full opacity and the entrance animation is removed, preserving all information without motion.

## Design decisions worth noting

- **Tokens over utilities:** color is always referenced via CSS variables, so theming and contrast are managed in one place and can't drift per-component.
- **One status language:** `StatusBadge` + a shared set of semantic tokens means "processing/ready/error" look identical in Library, Knowledge, and Document detail.
- **Accessibility is structural, not cosmetic:** skip link, live regions, listbox semantics, and labelled icon buttons are part of the component contracts (and their tests), not bolted on after the fact.
- **Motion communicates state** (thinking → streaming → settled) and is fully opt-out-able via the OS preference.
