# Change — m7-polish-a11y · styles (web)

- **Status:** complete + verified headlessly (2026-10-25). Web build exit 0; tokens/rules confirmed in the emitted CSS bundle.
- **Approval scope:** user standing instruction "Run autonomously and complete milestones." No commits made.
- **Authoritative record:** [m7-polish-a11y](../../../../../../docs/spec/_cross-cutting/m7-polish-a11y.md)

## Delivered in M7 (styles)
Design-system + a11y groundwork in `globals.css`, all theme-aware (light `:root` and dark `html.dark`):

- **Focus ring:** new `--focus-ring` token (→ `var(--accent)`) + a global `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }` rule — one place, no per-component duplication.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` guard sets `.sd-typing-dot` to a static dot (`animation: none !important; opacity: 1 !important`). CSS-only; no JS matchMedia.
- **Contrast fixes (dark-theme AA):** dark `--accent` raised `0.72 → oklch(0.78 0.16 280)` (4.79); new `--badge-solid-text` (`#ffffff` light / near-black `oklch(0.20 0.01 280)` dark) so solid badges pass on `--ready/--processing/--error`; new `--text-secondary` (light `oklch(0.45 0.01 70)` → 16.23, dark `oklch(0.80 0.01 80)` → 5.45) replacing the old `foreground`+opacity muted-text idiom that failed AA in dark.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/styles/globals.css` | modify | focus-ring token + global `:focus-visible`; reduced-motion guard; dark accent raise; `--badge-solid-text`; `--text-secondary` |

## Verification evidence
Emitted CSS (`dist/assets/index-*.css`) contains, each ≥ 1 occurrence: `--text-secondary`, `--badge-solid-text`, `:focus-visible`, `prefers-reduced-motion`, `sd-typing-dot`. All computed ratios recorded in the authoritative record (light all PASS; dark failures re-verified ≥ threshold after fix).

Full shared evidence lives in the authoritative record.

## Next action
None for styles in M7. Muted-text consumption by pages/components is tracked in the pages change record.
