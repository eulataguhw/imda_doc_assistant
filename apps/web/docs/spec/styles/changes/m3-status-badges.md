# Change — m3-status-badges · styles (web)

- **Status:** complete + verified headlessly (2026-10-24).
- **Approval scope:** user standing instruction to implement M3 and pause at the boundary; no commits made.
- **Authoritative record:** [m3-status-badges](../../../../../../docs/spec/_cross-cutting/m3-status-badges.md)

## Delivered in M3

Semantic status tokens `--ready`/`--processing`/`--error` (oklch) added to both the light (`:root`) and dark (`html.dark`) blocks. Consumed via inline `style={{ backgroundColor: "var(--ready)" }}`, so they work regardless of Tailwind theme config. Existing `--background/--foreground/--muted/--accent` unchanged.

## Files

| Path                              | Op     | Reason                                             |
| --------------------------------- | ------ | -------------------------------------------------- |
| `apps/web/src/styles/globals.css` | modify | add 3 status tokens to light + dark blocks (oklch) |

## Verification evidence

Emitted CSS (`dist/assets/*.css`) contains all three tokens in **both** theme blocks. Light: `--ready:oklch(62% .15 155)` · `--processing:oklch(72% .14 80)` · `--error:oklch(60% .19 25)`. Dark: `oklch(74% .14 155)` · `oklch(80% .13 80)` · `oklch(71% .16 25)`.

Full shared evidence lives in the authoritative record.

## Next action

M4: add any task/progress-specific tokens as ingestion UI lands.
