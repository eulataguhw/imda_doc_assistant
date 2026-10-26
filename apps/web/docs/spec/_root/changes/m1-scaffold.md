# Change — m1-scaffold · _root

- **Status:** complete (build-verified 2026-10-22; browser pass pending)
- **Approval scope:** user standing instruction to proceed with the scaffold and pause after; no commits made.
- **Authoritative record:** [m1-scaffold](../../../../docs/spec/_cross-cutting/m1-scaffold.md)

## Delivered in M1

Provider stack (theme + routing), app shell with nav, and the three routes.

## Files

| Path                    | Op     | Reason             |
| ----------------------- | ------ | ------------------ |
| `apps/web/src/main.tsx` | create | providers + mount  |
| `apps/web/src/App.tsx`  | create | shell, nav, routes |

## Verification evidence

`tsc` + `vite build` exit 0 (2026-10-22); bundle `index-BdU_Nz6d.js` 264.60 kB emitted. Browser pass pending.

Full shared evidence lives in the authoritative record.

## Next action

None for M1 scope.
