# Change — m1-scaffold · pages

- **Status:** complete (build-verified 2026-10-22; browser pass pending)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1
Compilable stubs for both views with honest placeholder copy.

## Files
| Path | Op | Reason |
| --- | --- | --- |
| `apps/web/src/pages/LibraryPage.tsx` | create | Library stub (M2 fills) |
| `apps/web/src/pages/ChatPage.tsx` | create | Chat stub (M3 fills) |

## Verification evidence
`tsc` + `vite build` exit 0 (2026-10-22). Browser pass pending.

Full shared evidence lives in the authoritative record.

## Next action
M2: Library wired to `/api/documents` + upload affordance.
