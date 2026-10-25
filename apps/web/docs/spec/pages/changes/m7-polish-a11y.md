# Change — m7-polish-a11y · pages (web)

- **Status:** complete + verified headlessly (2026-10-25; web build exit 0, strings/attrs confirmed in the emitted JS bundle). Live keyboard/click-through left to user at :5173.
- **Approval scope:** user standing instruction "Run autonomously and complete milestones." No commits made.
- **Authoritative record:** [m7-polish-a11y](../../../../../../docs/spec/_cross-cutting/m7-polish-a11y.md)

## Delivered in M7 (pages + components)
Empty/loading/error states, micro-interactions, and the WCAG 2.1 AA pass on the consumer side of the new style tokens:

- **LibraryPage:** plain "Loading documents…" → presentational `SkeletonRows` (`aria-hidden` + a single sr-only "Loading documents…" label, so AT gets one announcement not N); error branch now a `role="alert"` box with a working **Retry** button (calls `load()`); muted text/icon → `--text-secondary`.
- **ChatPage:** persistent polite live region announces streaming status ("Assistant is responding…") to assistive tech; disclaimer text → `--text-secondary`; typing dots get the `sd-typing-dot` class so the reduced-motion guard applies; the "Scoped to:" chip label's dark-failing `opacity-70` blend (3.51:1) → `[color:var(--text-secondary)]`. Send-button disabled/ARIA state (M6) verified, unchanged.
- **AppShell:** a final residual scan for *Tailwind-class* opacity (missed by the inline-style grep) found inactive nav links at `opacity-60` = 2.35:1 in dark — an AA fail. Inactive links → `[color:var(--text-secondary)]`, active → `[color:var(--accent)]`, hover → foreground (all via classes so hover still works). Theme-toggle icon left at `opacity-70`: it is non-text and passes the 3:1 UI-component threshold (3.51:1).
- **DocumentDetailPage:** all `foreground`+opacity muted text/icon → `--text-secondary`; excerpt error path drops its 0.9 opacity to full-opacity `--error` (AA in both themes).
- **Toaster / StatusBadge:** contrast-only fixes already scoped — dismiss icon 60%→85%, solid badge text via `--badge-solid-text`. ARIA (`aria-live="polite"`, `role="status"`) verified, unchanged.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/pages/LibraryPage.tsx` | modify | `SkeletonRows`; error → `role="alert"` + Retry; muted text/icon → `--text-secondary` |
| `apps/web/src/pages/ChatPage.tsx` | modify | `aria-live="polite"` streaming region; disclaimer → `--text-secondary`; "Scoped to:" label dark-failing `opacity-70` → `[color:var(--text-secondary)]`; dots classed for reduced-motion |
| `apps/web/src/pages/DocumentDetailPage.tsx` | modify | muted text/icon → `--text-secondary`; excerpt error path full-opacity `--error` |
| `apps/web/src/components/Toaster.tsx` | modify | dismiss icon opacity 60%→85% (contrast) |
| `apps/web/src/components/StatusBadge.tsx` | modify | solid variant text → `var(--badge-solid-text)` (was hardcoded white) |
| `apps/web/src/components/AppShell.tsx` | modify | inactive nav links dark-failing `opacity-60` (2.35:1) → `[color:var(--text-secondary)]`; active → `[color:var(--accent)]`; hover → foreground |

## Verification evidence (abridged)
- Residual scan for *Tailwind-class* opacity across `pages/` + `components/` found 2 dark-theme AA fails (`AppShell` inactive nav 2.35:1, `ChatPage` "Scoped to:" label 3.51:1); both fixed via `--text-secondary`, light theme already passed everywhere.
- `npm run build` (tsc + vite) **exit 0** after the fixes; emitted CSS contains `color:var(--text-secondary)`, `:hover{color:var(--foreground)}`, `color:var(--accent)`.
- Emitted JS contains: "Failed to load documents", "Assistant is responding", `sr-only`, `role="alert"`, `--text-secondary`.
- No new dependencies; all interactive elements remain native `<button>`/`<a>`/`<input>` (no div-only handlers introduced).

Full shared evidence + the full contrast table lives in the authoritative record.

## Next action
M7 complete — v3-M4 *Polish & a11y* done. Pause at milestone boundary per standing instruction; await explicit commit approval for M4+M5+M6+M7 and user live click-through feedback.
