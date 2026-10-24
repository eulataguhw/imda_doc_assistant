# DocAssist Design System

A hard constraint for every Superdesign generation. Explore layout, structure, hierarchy, and content direction freely — never the visual style. The palette, type, spacing, and component treatments below are fixed; do not introduce any font, color, or visual style that is not defined here.

## Product context

**DocAssist** is a document Q&A assistant. Users upload PDF documents into a Library, then ask questions in Chat and receive answers streamed token-by-token (SSE) with citations back to the specific source document and page. It is a two-page single-page app: **Library** (the document list) and **Chat** (the question/answer surface), plus a **Document detail** view reached from a Library row.

- **JTBD**: "I have a stack of PDFs I can't easily search across. I want to ask a plain-language question and get an answer that tells me exactly which document and page it came from, so I trust the result."
- **Key pages & architecture**:
  - **AppShell** — fixed top navigation bar (3rem / `h-12`) with the "DocAssist" wordmark, two nav links (Library, Chat) with active-state opacity, and a theme-toggle button. Content renders below in a centered column.
  - **Library** (`/`, `/library`) — list of uploaded documents. Each row is a link to its detail view showing title + a status badge. The upload affordance and the three states (ready / processing / error) are core to this page.
  - **Document detail** (`/documents/:id`) — single document: back link, title, status badge, id. Should bridge into Chat ("ask about this").
  - **Chat** (`/chat`) — the conversational surface: streamed answers with citation chips (document + page), a document-scoped input, and starter suggestions. This is the highest-value screen and currently a stub.
- **Key features**: PDF upload; cross-document Q&A; token-streamed (SSE) answers; citations to source doc + page; light/dark theming.

## Branding & styling

### Color (oklch, semantic — use ONLY these)

| Role | Light (`:root`) | Dark (`.dark`) |
| --- | --- | --- |
| Background (warm off-white / deep indigo-black) | `oklch(0.985 0.004 90)` | `oklch(0.19 0.008 280)` |
| Foreground (primary text) | `oklch(0.21 0.01 70)` | `oklch(0.93 0.005 80)` |
| Muted (borders, dividers, loading text, fallback badge bg) | `oklch(0.94 0.006 80)` | `oklch(0.26 0.008 280)` |
| Accent (indigo — back links, active hints, interactive emphasis) | `oklch(0.62 0.21 275)` | `oklch(0.72 0.18 280)` |
| Ready (green status) | `oklch(0.62 0.15 155)` | `oklch(0.74 0.14 155)` |
| Processing (amber status) | `oklch(0.72 0.14 80)` | `oklch(0.80 0.13 80)` |
| Error (red status + error text) | `oklch(0.60 0.19 25)` | `oklch(0.71 0.16 25)` |

The accent is **indigo**. Status colors are semantic: green = ready, amber = processing, red = error. Do not add new hues (no pink, neon, or purple gradients). Surfaces use the background/muted tokens; text uses foreground; interactive emphasis and links use the indigo accent.

### Typography

- **No custom font is loaded.** Use the system sans-serif stack (Tailwind default). Do NOT introduce serif, monospace-as-body, or decorative fonts.
- Scale in use: `text-xs` for status pills, `text-sm` for nav links and buttons, larger headings for page titles.
- Brand wordmark "DocAssist": `font-semibold tracking-tight`.

### Spacing & radius (observed usage — stay within this system)

- Nav link: `rounded-md px-3 py-1.5`; icon button: `rounded-md px-2 py-1` / `p-2`.
- Status pill: `rounded-full px-2.5 py-0.5 inline-flex items-center text-xs font-medium`.
- Page padding: `p-6`; content column: `mx-auto max-w-4xl`; page fill height: `min-h-[calc(100vh-3rem)]` (nav is 3rem / `h-12`).

### Layout structure

- Fixed top nav bar (`h-12`, bottom border) with wordmark left, nav links, theme toggle right.
- Centered content column `max-w-4xl` below the nav.
- Clean, low-chrome, utility-driven aesthetic (Tailwind). No heavy decoration, no cards-with-heavy-shadows by default; use subtle borders (`--muted`) and spacing for separation rather than drop shadows.

### Icons

- **Lucide** icon set, reproduced 1:1 as inline SVGs. Use Lucide icons only (e.g. `library`, `moon`/`sun`, `upload`, `send`, `file-text`). No emoji, no invented glyphs.

## Motion / animation patterns

- Theme switch is a token swap under `.dark` — no transition library; keep any motion minimal and purposeful.
- Chat answers stream token-by-token (SSE) — the design should make the streaming state legible (a subtle "thinking"/typing indicator while tokens arrive, then the full answer). Do not fake a long spinner for content that streams in.
- Micro-interactions (hover/active on nav links and buttons) use opacity/color shifts within the existing palette, not scale bounces or new colors.

## Specific project requirements

- **Light AND dark** must both be represented; both themes use the same layout and components, only the token values change.
- **Status system is semantic and consistent**: ready = green, processing = amber, error = red, rendered as the rounded-full pill pattern above. Use it identically on Library rows and the detail page.
- **Citations are a first-class element** in Chat: each answer shows chips naming the source document and page. These must be visually distinct from body text (muted/accent treatment) and clearly referenceable.
- **Keep the "DocAssist" wordmark text-only** — there is no logo image asset. Do not fabricate a brand mark, initials badge, or invented SVG logo. Text may appear where the source UI shows it.
- Faithful to an existing two-page SPA: Library and Document detail should first reproduce the current rendered structure (list rows, back link, title + badge), then explore elevated hierarchy/spacing/content within this system. Chat is a new design but must conform to this same visual language.

## Fidelity constraint (append to every prompt)

Use ONLY the fonts, colors, spacing, and component styles defined in this design system. Do not introduce any fonts, colors, or visual styles not in the design system. Keep the system sans-serif typeface, the warm off-white / deep indigo-black backgrounds, the muted borders, the indigo accent, and the green/amber/red status pills exactly as specified.
