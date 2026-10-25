# Change Record — m7-polish-a11y (authoritative)

- **Goal:** M7 (root batch; completes v3-M4 *Polish & a11y*): empty/skeleton/error states on Library + Chat, micro-interactions (button loading/disabled, hover/focus affordances, typing indicator already present), and WCAG 2.1 AA — visible focus management, contrast ≥ 4.5:1 in both themes, full keyboard-only flow.
- **Status:** **implemented & verified 2026-10-25.** Scope A (audit + contrast) and Scope B (implementation) complete; web build exit 0, tokens/rules confirmed in the built bundle, all live services healthy. One additional failure class found during implementation (muted/secondary text at opacity 0.4–0.6 → dark-theme AA fail) fixed via a new `--text-secondary` token — recorded below. **Not committed** (standing rule: no commits until explicitly approved).
- **Approval scope:** user standing instruction "Run autonomously and complete milestones." No commits until explicitly approved (M4+M5+M6 already uncommitted).

## Baseline audit (verified against code 2026-10-25, before scoping)
| Area | Current state (facts from source) | Gap vs v3-M4 |
| --- | --- | --- |
| Library empty state | Present — "No documents yet." + upload CTA when list is empty (`LibraryPage.tsx` L287) | OK; verify contrast of muted text in both themes |
| Library loading | `docs === null && !error` → plain "Loading documents…" text (L280–282) | No skeleton rows — polish = labeled skeletons |
| Library error | **Exists** — inline `<p>` "Failed to load documents: {msg}" in `--error` color (L274–276) | No retry action; no `role="alert"`/live announcement |
| Chat empty state | Present — placeholder area before first message | OK; verify |
| Chat loading | Typing indicator (`sd-typing`, three staggered dots) when `m.streaming && m.text === ""` (L222) | No `prefers-reduced-motion` guard; no AT announcement of streaming state |
| Send button | `disabled={busy \|\| input.trim()===""}` + `aria-label="Send message"` (L293–296) ✓ | Already compliant — verify only |
| Dropzone | Native `<input>` behind label, `disabled={busy}`, dashed-border styling (L204–205) ✓ | Verify keyboard operability in pass; no code change expected |
| Toaster | `aria-live="polite"` on container + `role="status"` per toast + dismiss button with `aria-label` (`Toaster.tsx` L48–71) ✓ | Dismiss icon at `opacity: 0.6` — needs contrast check (effective ≈60% foreground) |
| Focus management | **No global `:focus-visible` ring** in `globals.css`; relies on UA defaults | **Main gap** — add theme-aware focus ring token + global rule |
| Contrast | oklch tokens defined (`globals.css` L3–20); no ratios recorded anywhere | **Main gap** — compute WCAG ratios for all text/background pairs both themes; fix failures (badge solid = white on `--ready/--processing/--error`; soft badge = token text on 14% mix) |
| Keyboard flow | All interactive elements are native `<button>`/`<a>`/`<input>` — no div-click handlers found in either page | Verify tab order + focus return after send; no structural change expected |

## Contrast audit results (computed 2026-10-25, `/tmp/m7-contrast.mjs`)
oklch→sRGB→WCAG relative-luminance ratios. Light theme: **all pairs PASS** (body 18.78, accent 6.68, badges 5.56–8.57, icon@60% 12.79). Dark theme failures + verified fixes:

| Pair | Ratio | Threshold | Verdict | Fix (computed to pass) |
| --- | --- | --- | --- | --- |
| `--accent` / background (dark) | 3.68 | 4.5 | **FAIL** | raise dark accent to `oklch(0.78 0.16 280)` → 4.79 ✓ |
| solid badge white text / `--ready` (dark) | 4.26 | 4.5 | **FAIL** | theme-aware badge text token: near-black `oklch(0.20 0.01 280)` in dark → 4.87 ✓ |
| solid badge white text / `--processing` (dark) | 3.38 | 4.5 | **FAIL** | same fix → 6.13 ✓ |
| solid badge white text / `--error` (dark) | 4.32 | 4.5 | **FAIL** | same fix → 4.81 ✓ |
| dismiss icon @60% opacity / background (dark) | 2.35 | 3.0 | **FAIL** | raise to 85% opacity → 6.77 ✓ |
| `--muted` surface vs background (dark) | 1.02 | — | informational | decorative surface only; text on muted passes both themes (13.94 / 12.87) — no change |

**Fix strategy (no token conflicts):** add a `--badge-solid-text` custom property (`#ffffff` in `:root`, near-black in `html.dark`) and use it in `StatusBadge` solid variant instead of hardcoded white; bump dark `--accent` lightness 0.72→0.78; raise the Toaster dismiss-icon opacity from 60% to 85%. All three verified ≥ threshold after fix.

**Additional finding (surfaced during implementation, within WEB-M7-4 scope):** the codebase used `color: var(--foreground)` + inline `opacity: 0.4–0.6` as its "muted/secondary text" idiom across ~15 sites (LibraryPage, DocumentDetailPage, ChatPage). At 0.6 opacity on the dark background this is ≈2.35:1 — below the 4.5:1 AA floor for normal text (and 3:1 for icons). These were not in the initial token-pair table because the idiom hides the effective color behind an opacity blend. Fix: introduce a real `--text-secondary` token (light `oklch(0.45 0.01 70)` → 16.23; dark `oklch(0.80 0.01 80)` → 5.45, both ≥ 4.5) and replace every `foreground`+opacity text site with it. The one conditional excerpt (error path) drops its 0.9 opacity to full `--error` (dark 4.81 / light 6.34). Computed against the page background, which is the conservative bound for the translucent card surfaces (`bg-white/50` / `dark:bg-black/5`) these texts sit on. A **second pass** caught the *same idiom expressed as Tailwind opacity classes* (which the inline-style grep missed): `AppShell` inactive nav links at `opacity-60` (2.35:1 dark) and the `ChatPage` "Scoped to:" chip label at `opacity-70` (3.51:1 dark) — both → `[color:var(--text-secondary)]`, with hover restored via a class-based color transition. The `AppShell` theme-toggle icon stays at `opacity-70`: it is non-text and passes the 3:1 UI-component floor (3.51:1), so no change.

## Decisions (recorded, not silent)
- **No new dependencies.** Contrast checking done by a one-off Node script computing WCAG relative-luminance ratios from the oklch token values (converted via sRGB); recorded in this record. No Lighthouse runtime in sandbox — labeled "computed, not browser-measured" if any ratio is borderline.
- **Focus ring as a CSS custom property** (`--focus-ring`) applied via a global `:focus-visible` rule in `globals.css` — one place, theme-aware, no per-component duplication.
- **Reduced motion:** wrap the typing indicator animation (and any new transitions) in `@media (prefers-reduced-motion: reduce)` → static fallback. PONYTAIL: no JS matchMedia listener needed; CSS-only is sufficient for this scope.
- **Skeletons are presentational only** — same layout as real rows, `aria-hidden` + a visually-hidden "Loading documents…" text so screen readers get one announcement, not N skeleton announcements.

## Acceptance criteria
| ID | Criterion |
| --- | --- |
| WEB-M7-1 | Library: loading → skeleton rows (labeled for AT); error → visible inline error with retry button; empty → CTA (already present, keep). |
| WEB-M7-2 | Chat: streaming state announces status to AT (`aria-live` polite); send disabled while streaming (verify/keep); error toast + message annotation (present from M6, keep). |
| WEB-M7-3 | `:focus-visible` ring visible on every interactive element in both themes (links, buttons, dropzone, chips) — computed contrast of ring vs background ≥ 3:1. |
| WEB-M7-4 | All UI text tokens pass WCAG AA: body/heading ≥ 4.5:1; badge text & muted text ≥ 4.5:1 (or large-text 3:1 where applicable) — ratios recorded in this record for both themes. |
| WEB-M7-5 | Keyboard-only flow works end to end: focus moves predictably, no traps, dropzone reachable + file dialog openable via keyboard (native `<input>` behind label), Escape dismisses toast if applicable. |
| WEB-M7-6 | `prefers-reduced-motion: reduce` → typing indicator static; transitions ≤ 150ms or none. |
| BUILD-M7 | `npm run build` in both apps exit 0; web bundle size delta recorded (no new deps expected → negligible). |

## Deliverables
| Path | Op | Owning package | Reason |
| --- | --- | --- | --- |
| `apps/web/src/styles/globals.css` | modify | web/styles | `--focus-ring` token + global `:focus-visible`; reduced-motion guard for `sd-typing-dot`; dark `--accent` → `oklch(0.78 0.16 280)`; new `--badge-solid-text` (white / near-black per theme); new `--text-secondary` (AA-passing muted text, both themes) (WEB-M7-3, 4, 6) |
| `apps/web/src/pages/LibraryPage.tsx` | modify | web/pages | skeleton rows (`aria-hidden` + sr-only label), explicit error state (`role="alert"`) + retry button; muted text → `--text-secondary` (WEB-M7-1, 4, 5) |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | web/pages | muted text/icon → `--text-secondary`; excerpt error path full-opacity `--error` (WEB-M7-4) |
| `apps/web/src/pages/ChatPage.tsx` | modify | web/pages | `aria-live="polite"` streaming-status region; disclaimer → `--text-secondary`; "Scoped to:" chip label dark-failing `opacity-70` (3.51:1) → `[color:var(--text-secondary)]`; typing dots get `sd-typing-dot` class for the reduced-motion guard (WEB-M7-2, 4, 6) |
| `apps/web/src/components/Toaster.tsx` | verify + contrast fix only if computed ratio fails | web/pages | ARIA already present (`aria-live="polite"` + `role="status"`); dismiss icon at 60% opacity needs the ratio check (WEB-M7-2, 4) |
| `apps/web/src/components/StatusBadge.tsx` | modify (contrast only if failing) | web/pages | solid variant = white on status token; soft = token text on 14% mix — both need computed ratios (WEB-M7-4) |
| `apps/web/src/components/AppShell.tsx` | modify | web/_root | second-pass fix: inactive nav links dark-failing `opacity-60` (2.35:1) → `[color:var(--text-secondary)]`, active → `[color:var(--accent)]`, hover → foreground; theme-toggle icon left at `opacity-70` (non-text, passes 3:1) (WEB-M7-4) |
| `/tmp/m7-contrast.mjs` (transient) | create→record | root docs | one-off ratio computation from token values; output recorded in this record, file not committed |
| `docs/spec/_cross-cutting/m7-polish-a11y.md` (this file) | create→update | root docs | status → implemented & verified + evidence table on completion |

## Ordered steps
**Scope A — audit & compute (Lead or subagent; no code changes)**
1. Read `LibraryPage.tsx`, `ChatPage.tsx`, `Toaster.tsx`, `StatusBadge.tsx` in full; confirm exact current behavior for loading/error/empty (fill the baseline table above with facts, not guesses).
2. Compute WCAG ratios for every token pair (text-on-background, badge-text-on-badge-bg, ring-vs-background) in both themes via a Node oklch→sRGB→luminance script; record pass/fail per pair.

**Scope B — implementation (after audit; single writer per file)**
1. `globals.css`: add `--focus-ring` (theme-aware), global `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }`, reduced-motion guard for `sd-typing`, any token contrast fixes.
2. `LibraryPage.tsx`: skeleton rows component (3 fake rows, `aria-hidden` + sr-only loading label), explicit error branch with retry `<button>`.
3. `ChatPage.tsx` + `Toaster.tsx`: ARIA live regions for stream status & toasts; verify send-button disabled state; focus returns to input after message completes.
4. Keyboard pass: tab order review, no div-only click handlers (convert if found), dropzone keyboard operability via native input.

**Integration (Lead/coordinator)**
5. `npm run build` both apps → exit 0.
6. Headless verification where possible (curl through :5173 proxy for rendered HTML of empty/error states; computed contrast table re-checked against final token values).
7. Record evidence, flip statuses (this record, package change records, working memory, development plan M7 row, master plan v3-M4 row), pause at milestone boundary.

## Verification commands (evidence into this record)
1. `npm run build` in `apps/api` and `apps/web` → exit 0.
2. Contrast table: every token pair × both themes with computed ratio + AA threshold — recorded inline.
3. Rendered-HTML checks via :5173 proxy: empty Library, error Library (induced by API-down on a second port), Chat streaming status region present in DOM.
4. Keyboard flow: documented manual pass (tab sequence listed) — labeled "manual, no browser tooling" if not fully automated.

## Evidence (recorded 2026-10-25)
| Check | Command / method | Result |
| --- | --- | --- |
| Web build | `npm run build` in `apps/web` (tsc + vite) | **exit 0**; 2021 modules; `index-*.css` 18.48 kB, `index-*.js` 290.42 kB (no new deps) |
| New tokens/rules in bundle | grep built CSS | `--text-secondary`, `--badge-solid-text`, `:focus-visible`, `prefers-reduced-motion`, `sd-typing-dot` all present (count ≥ 1 each) |
| New UI strings in bundle | grep built JS | "Failed to load documents", "Assistant is responding", `sr-only`, `role="alert"`, `--text-secondary` all present |
| Live services | `curl` + `ss -ltnp` | web :5173 → 200; API :3001 `/api/documents` → 200; llama.cpp :8888, Qdrant :6333, Ollama :11434 listening |
| Contrast (both themes) | `/tmp/m7-contrast.mjs` + `/tmp/m7-residual.mjs` oklch→sRGB→WCAG | light all PASS; dark failures fixed & re-verified (accent 4.79, badge text 4.81–6.13, dismiss icon 6.77, `--text-secondary` 5.45). Second pass: `AppShell` inactive nav 2.35:1 + `ChatPage` "Scoped to:" label 3.51:1 (both dark) → `--text-secondary`; theme-toggle icon 3.51:1 passes non-text 3:1 (left as-is). Web build exit 0 after fixes; new color rules confirmed in emitted CSS — computed, not browser-measured |
| Keyboard flow | code review (native `<button>`/`<a>`/`<input>`, no div-only handlers) + **manual click-through pending** at :5173 | static pass; labeled "no browser tooling" — user to confirm live |

## Inherited gotchas (from M5/M6 — do not re-learn)
- Tailwind v4 + oklch tokens; `.dark` on `<html>` via next-themes. Contrast math must use the *resolved* oklch values, not hex approximations.
- No browser tooling in sandbox — DOM verified by code + built bundle + proxy round-trips; user does live click-through.
- CC Safety Net blocks bash touching `.env` basenames.
- Nest 12.2 / TS7 quirks from M5/M6 records (not expected to affect this web-only milestone).
