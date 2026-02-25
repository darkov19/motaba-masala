# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story’s `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2026-02-25 | 2.1 | 2 | Bug | High | TBD | Done | Derive authorization role from authenticated server-side context/session instead of trusting request `actor_role`. Resolved 2026-02-25. Ref: `internal/app/inventory/service.go` |
| 2026-02-25 | 2.1 | 2 | Bug | High | TBD | Done | Remove hardcoded `actor_role: "ADMIN"` from frontend master-data API calls and rely on server identity. Resolved 2026-02-25. Ref: `frontend/src/services/masterDataApi.ts` |
| 2026-02-25 | 2.1 | 2 | Bug | Med | TBD | Done | Respect explicit `is_active=false` for packaging profile create path. Resolved 2026-02-25. Ref: `internal/infrastructure/db/sqlite_inventory_repository.go` |
| 2026-02-25 | 2.1 | 2 | TechDebt | Med | TBD | Done | Add integration test for non-existent `packing_material_item_id` rejection. Resolved 2026-02-25. Ref: `internal/infrastructure/db/sqlite_inventory_repository_test.go` |
| 2026-02-25 | 2.2B | 2 | Bug | Med | TBD | Done | Source frontend guard role from trusted authenticated context/session binding instead of local/session storage role keys. Resolved 2026-02-25. Ref: `internal/app/app.go`, `cmd/server/main.go`, `frontend/src/App.tsx`, `frontend/src/shell/rbac.ts` |
| 2026-02-25 | 2.2B | 2 | Bug | Med | TBD | Done | Add regression test that tampered storage role values do not elevate effective frontend guard role beyond authenticated session context. Resolved 2026-02-25. Ref: `frontend/src/__tests__/AppShellRBAC.test.tsx` |
| 2026-02-25 | 2.2B | 2 | TechDebt | Low | TBD | Done | Replace deprecated Ant Design prop usage (`Space direction`, `Alert message`) with supported API to reduce warning noise/upgrade risk. Resolved 2026-02-25. Ref: `frontend/src/shell/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/shell/RoleShellNavigation.tsx` |
