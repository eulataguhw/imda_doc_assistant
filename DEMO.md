# 20-Minute Live Demonstration Guide & Script

This guide outlines the minute-by-minute agenda, talking points, interactive flows, and evaluator defense strategies for the **AI-Powered Document Assistant** 20-minute technical evaluation.

---

## 1. Demonstration Agenda & Timing

```
[00:00 - 05:00]  1. End-to-End Core Workflow Demo
[05:00 - 10:00]  2. Design System & Accessibility Walkthrough
[10:00 - 14:00]  3. Architecture & State Management Walkthrough
[14:00 - 17:00]  4. Challenges Encountered & Frontend Solutions
[17:00 - 20:00]  5. Technical Q&A & Scaling Discussion
```

---

## 2. Minute-by-Minute Demonstration Script

### Part 1: End-to-End Workflow (Minutes 00:00 – 05:00)

**Goal:** Prove the core ingestion, RAG retrieval, progressive token streaming, and inline citation linking.

1. **Upload Flow (`KnowledgePage`):**
   - Navigate to `/` (Knowledge).
   - Drag and drop a sample policy PDF (e.g. `policy-brief.pdf`).
   - Highlight the **optimistic UI**: Card appears immediately with an amber `processing` [`StatusBadge`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/components/StatusBadge/StatusBadge.tsx).
   - Point out background progress indicator: `indexing X/Y chunks`.
   - Once complete, badge transitions to green `ready`.
2. **Direct Action Link:**
   - Click **"Ask about this"** on the card. Point out how this routes to `/chat?docId=...`, automatically resetting any active session and initiating a clean, fresh conversation pre-scoped specifically to that document.
3. **Conversational Multi-Part Query:**
   - In [`ChatPage`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/pages/ChatPage/ChatPage.tsx), ask:
     > _"What are the three main recommendations in this document and what evidence supports each one?"_
   - Press `Enter` (mention keyboard shortcut `Enter` = send, `Shift+Enter` = newline).
4. **Streaming & Citations Walkthrough:**
   - Show the **optimistic message bubble** appearing instantly before any token arrives.
   - Point out the **three typing dots** (`.sd-typing-dot`) representing the upstream thinking state.
   - Show **citations arriving first** as clickable source chips.
   - Observe progressive token rendering with the **live blinking stream cursor** (`.sd-stream-cursor`).
   - Click an inline citation chip `[Document.pdf · p.4]` to navigate directly to [`DocumentDetailPage`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/pages/DocumentDetailPage/DocumentDetailPage.tsx) showing extracted metadata, summary, and content preview.

---

### Part 2: Design System & Accessibility (Minutes 05:00 – 10:00)

**Goal:** Demonstrate UI/UX craft, tokenized theming, and strict WCAG 2.1 AA compliance.

1. **Design System & Tokens:**
   - Open DevTools inspector on `<html>`. Show how color is driven by **oklch tokens** (`--background`, `--foreground`, `--accent`, `--text-secondary`).
   - Toggle the theme button in [`AppShell`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/components/AppShell/AppShell.tsx). Demonstrate instantaneous, flicker-free re-skinning across all views, focus rings, and badges. Refresh the browser to prove theme persistence via `localStorage`.
2. **Non-Trivial Empty & Error States:**
   - Show `LibraryPage` empty state: polite illustrated guidance on how to attach files.
   - Show upload error handling: Try dropping an oversized file or unsupported format. Point out the instant error toast in [`Toaster`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/components/Toaster/Toaster.tsx) and the crimson badge state.
3. **Accessibility Demo (Hands off Mouse):**
   - Place hands visibly away from the mouse.
   - Press `Tab` from browser address bar:
     1. Reveal the **Skip Link** (`<a href="#main" class="skip-link">Skip to content</a>`). Press `Enter` to jump straight past the navigation into the main content.
     2. Tab through navigation links and composer. Show the **theme-aware `:focus-visible` outline** (`2px solid var(--focus-ring)`).
     3. Type a query, submit using `Enter`, and announce how screen readers consume the response through the off-screen `aria-live="polite"` region without receiving choppy token fragments.
   - Show test terminal running `npm test -w doc-web` passing [`AppShell.a11y.test.tsx`](file:///mnt/Inference/AI/Projects/doc-assistant/apps/web/src/components/AppShell/AppShell.a11y.test.tsx) with **0 axe violations**.

---

### Part 3: Architecture & State Management (Minutes 10:00 – 14:00)

**Goal:** Show component decomposition, clean separation of concerns, and resilient state.

1. **Component Decomposition:**
   - Presentational components (`components/AppShell`, `components/Markdown`, `components/StatusBadge`, `components/Toaster`) are stateless and purely presentational.
   - Routed views (`pages/*`) are lazy-loaded containers wrapped in `React.lazy` and `Suspense`, ensuring fast initial page loads.
2. **Zustand State Architecture:**
   - Explain why Zustand external stores (`useDocumentsStore`, `useSessionsStore`) were chosen over React Context:
     - Selectors return stable references, avoiding unnecessary re-renders.
     - State **survives route navigation** without re-fetching or resetting in-flight streams.
3. **SSE Protocol Reliability:**
   - Walk through the Server-Sent Events lifecycle: `citation`* → `chunk`* → `done` | `error`.
   - Explain how pre-stream failures return standard HTTP 502 JSON, while mid-stream disconnects emit in-band SSE error frames.
   - Highlight client abort handling: navigating away aborts the Fetch `ReadableStream`, triggering server-side cancellation of the upstream LLM generation.

---

### Part 4: Challenges & Solutions (Minutes 14:00 – 17:00)

**The Hardest Frontend Problems Encountered:**

1. **The Dark-Theme Contrast Trap with CSS Opacity:**
   - _Problem:_ Initial implementations used `foreground` color with `opacity: 0.5` for muted metadata. In dark mode, opacity blending against deep indigo canvases dropped contrast below 3:1, failing WCAG AA.
   - _Solution:_ Replaced ad-hoc opacity with an explicit perceptual token (`--text-secondary: oklch(0.72 0.015 260)`), guaranteeing >= 4.6:1 contrast in both light and dark themes.
2. **Preventing React 19 Re-render Cascades During High-Speed Streaming:**
   - _Problem:_ High-throughput LLMs streaming multiple tokens per millisecond caused thrashing in the React virtual DOM when every token invoked state setters.
   - _Solution:_ Buffering deltas in the streaming reader and updating accumulated text in chunk batches, paired with memoized markdown rendering.
3. **Graceful Mid-Stream Disconnects:**
   - _Problem:_ If an LLM drops the connection after headers have already been sent with HTTP 200, standard HTTP error handlers fail to trigger.
   - _Solution:_ Built an in-band SSE error event contract (`{"type":"error","reason":"..."}`). The client preserves all text accumulated so far and appends an inline retry alert rather than blanking the message.

---

### Part 5: Evaluator Q&A & Interview Defense (Minutes 17:00 – 20:00)

#### Q1: "Why did you choose Vite + React instead of Next.js?"

> _"The backend is already a dedicated NestJS service that handles chunking, vector embeddings, and streaming. Using Next.js would have added an unnecessary Node server layer between the client and API without providing SSR benefits for an authenticated, dynamic document assistant. Vite delivers instantaneous HMR, smaller build outputs, and lets us serve the SPA as static Nginx assets in production with clean container boundaries."_

#### Q2: "How would you scale this frontend for a team of 10 engineers?"

> _"I would structure the codebase around domain feature modules rather than global layers: (1) Adopt Turborepo to split components, stores, and API contracts into internal workspace packages; (2) Introduce Storybook with automated visual regression tests; (3) Implement MSW (Mock Service Worker) for API contract mocking so frontend engineers can develop views independently of backend endpoints; and (4) Enforce strict PR review gates with typed API DTOs generated from OpenAPI schemas."_

#### Q3: "What compromises were made regarding accessibility?"

> _"To avoid overwhelming screen reader users during real-time token streaming, we chose not to announce every incoming word token. Instead, we emit an initial polite announcement when generation begins and another when the stream completes. We also avoided complex multi-column grid navigation in the chat transcript in favor of a natural vertical reading flow that screen readers traverse effortlessly."_
