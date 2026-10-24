# Development Plan — web/_root

- **Deliverable:** provider stack + shell with two routes and theme toggle.
- **Order:** tokens (`styles`) → providers/routes (`_root`) → view stubs (`pages`). M1 delivered all three.
- **Validation:** `tsc` typecheck + `vite build` pass (verified 2026-10-22); runtime claims need a browser pass — labeled pending.
- **Rollout/recovery:** static SPA; recovery = rebuild. No server state owned here.
- **Status:** M1 complete (build-verified). Next: none for M1 scope.
