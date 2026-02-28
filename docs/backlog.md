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
| 2026-02-26 | 2.1 | 2 | Enhancement | Med | TBD | Done | Added item type extension tables and separated Item Master into type-specific views while preserving one canonical `items` master. Resolved 2026-02-26. Ref: `internal/infrastructure/db/migrations/000006_item_extension_tables.up.sql`, `frontend/src/components/forms/ItemMasterForm.tsx` |
| 2026-02-25 | 2.2B | 2 | Bug | Med | TBD | Done | Source frontend guard role from trusted authenticated context/session binding instead of local/session storage role keys. Resolved 2026-02-25. Ref: `internal/app/app.go`, `cmd/server/main.go`, `frontend/src/App.tsx`, `frontend/src/shell/rbac.ts` |
| 2026-02-25 | 2.2B | 2 | Bug | Med | TBD | Done | Add regression test that tampered storage role values do not elevate effective frontend guard role beyond authenticated session context. Resolved 2026-02-25. Ref: `frontend/src/__tests__/AppShellRBAC.test.tsx` |
| 2026-02-25 | 2.2B | 2 | TechDebt | Low | TBD | Done | Replace deprecated Ant Design prop usage (`Space direction`, `Alert message`) with supported API to reduce warning noise/upgrade risk. Resolved 2026-02-25. Ref: `frontend/src/shell/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/shell/RoleShellNavigation.tsx` |
| 2026-02-26 | 2.2E | 2 | TechDebt | Low | TBD | Done | Replace deprecated Ant Design `Space direction` prop with `orientation` in auth loading screen. Resolved 2026-02-26. Ref: `frontend/src/App.tsx:643` |
| 2026-02-26 | 2.2E | 2 | TechDebt | Low | TBD | Done | Replace deprecated Ant Design `Space direction` prop with `orientation` in auth login screen. Resolved 2026-02-26. Ref: `frontend/src/App.tsx:656` |
| 2026-02-26 | 2.3 | 2 | Bug | High | TBD | Done | Ensure recipe transactions always rollback on all error paths; removed shadowed-error rollback gap in `CreateRecipe`/`UpdateRecipe`. Resolved 2026-02-26. Ref: `internal/infrastructure/db/sqlite_inventory_repository.go:456`, `internal/infrastructure/db/sqlite_inventory_repository.go:532` |
| 2026-02-26 | 2.3 | 2 | TechDebt | High | TBD | Done | Added API contract success-path tests for `/inventory/recipes/update` and `/inventory/recipes/list` (create success path already covered). Resolved 2026-02-26. Ref: `cmd/server/api_server_test.go:420`, `cmd/server/api_server_test.go:483` |
| 2026-02-26 | 2.4 | 2 | TechDebt | High | TBD | Open | Add missing party API contract tests for update-success, list-success, and explicit operator write-denial mapping. Ref: `cmd/server/api_server_test.go:549`, `cmd/server/api_server_test.go:589`, `cmd/server/api_server_test.go:607` |
| 2026-02-26 | 2.4 | 2 | TechDebt | Med | TBD | Open | Add explicit party read-only UI test asserting operator mode hides create/edit controls while list remains accessible. Ref: `frontend/src/components/forms/__tests__/PartyMasterForm.test.tsx:33` |
| 2026-02-27 | 3.1 | 3 | Bug | High | TBD | Done | Add explicit negative-quantity (`< 0`) validation tests for GRN service/API and frontend paths. Resolved 2026-02-27. Ref: `internal/app/inventory/service_test.go`, `cmd/server/api_server_test.go`, `frontend/src/components/forms/__tests__/GRNForm.test.tsx` |
| 2026-02-27 | 3.1 | 3 | TechDebt | High | TBD | Done | Add frontend integration test proving multi-line RAW + PACKING_MATERIAL submission persists as discrete line items with independent stock effects. Resolved 2026-02-27. Ref: `frontend/src/components/forms/__tests__/GRNForm.test.tsx` |
| 2026-02-27 | 3.1 | 3 | Bug | High | TBD | Done | Add GRN write-path read-only license denial coverage (`CreateGRNRecord` and API mapping). Resolved 2026-02-27. Ref: `internal/app/inventory/service_test.go`, `cmd/server/api_server_test.go`, `cmd/server/api_server.go` |
| 2026-02-27 | 3.1 | 3 | TechDebt | High | TBD | Done | Add keyboard-first rapid-flow assertions for GRN entry (focus order, Enter-submit cadence, repeat-entry loop). Resolved 2026-02-27. Ref: `frontend/src/components/forms/GRNForm.tsx`, `frontend/src/components/forms/__tests__/GRNForm.test.tsx` |
| 2026-02-27 | 3.2 | 3 | Bug | High | TBD | Done | Implemented lot-reference persistence for downstream non-inbound stock movements/adjustments and traceability query exposure (AC3 gap from Story 3.2 review). Resolved 2026-02-27. Ref: `internal/infrastructure/db/sqlite_inventory_repository.go:1300`, `internal/infrastructure/db/sqlite_inventory_repository.go:1343`, `internal/app/inventory/service.go:837`, `cmd/server/api_server.go:533` |
| 2026-02-27 | 3.2 | 3 | TechDebt | Med | TBD | Done | Added integration/API tests proving lot-reference continuity across downstream non-inbound movement path (AC3). Resolved 2026-02-27. Ref: `internal/infrastructure/db/sqlite_inventory_repository_test.go:358`, `cmd/server/api_server_test.go:1003`, `cmd/server/api_server_test.go:1054` |
| 2026-02-28 | 3.3 | 3 | TechDebt | Med | TBD | Open | Add ProcurementLotsPage tests for "External" badge (source_type=SUPPLIER_GRN) and Unit Cost column rendering (AC2/AC3). Ref: `frontend/src/components/forms/__tests__/ProcurementLotsPage.test.tsx` |
| 2026-02-28 | 3.3 | 3 | Bug | Low | TBD | Open | Add UnitPrice >= 0 validation in GRN.Validate() to prevent negative purchase prices accepted via API. Ref: `internal/domain/inventory/entities.go:277` |
| 2026-02-28 | 3.3 | 3 | TechDebt | Low | TBD | Open | supplier_id FK not linked to material_lots (supplier_name only); add FK linkage when Epic 5 party-level lot lookups are implemented. Ref: `internal/infrastructure/db/sqlite_inventory_repository.go:1198` |
