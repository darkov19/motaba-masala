# Story 2.1: Item Master Management

Status: done

## Story

As a Store Keeper,
I want to create and manage items with specific types, base units, and packing-material classifications,
so that I can maintain a reliable inventory catalog that downstream procurement, production, and packing workflows can use.

## Acceptance Criteria

1. The system allows creation of item master records with required fields (`name`, `item_type`, `base_unit`) and persists them successfully. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
2. Item type assignment is restricted to supported categories (`RAW`, `BULK_POWDER`, `PACKING_MATERIAL`, `FINISHED_GOOD`) and rejects unsupported values. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
3. Packing-material item masters support subtype tags for operational grouping (for example `JAR_BODY`, `JAR_LID`, `CUP_STICKER`) without changing item-level stock ownership. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/epics.md#Story 2.1: Item Master Management]
4. Packaging consumption profiles can map one pack mode to multiple packing-material components and per-unit quantities for atomic deduction in packing workflows. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/PRD.md#FR-009A: Composite Packing Consumption Profiles]
5. Master data created in this story is discoverable by downstream modules through list/query interfaces. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]

## Tasks / Subtasks

- [x] Implement Item Master domain and persistence contracts for required fields and supported type enums (AC: 1, 2)
- [x] Add create/update/list application service methods for item masters with validation-first flow and explicit error payloads (AC: 1, 2, 5)
- [x] Extend item model and storage for optional `item_subtype` used by packing-material classification (AC: 3)
- [x] Implement packaging profile domain/persistence model and create/list service paths with component mapping (`packing_material_item_id`, `qty_per_unit`) (AC: 4)
- [x] Enforce referential integrity and type constraints for packaging profile components so only active `PACKING_MATERIAL` items are assignable (AC: 4)
- [x] Implement list/query endpoints used by downstream workflows to fetch active items and packaging profiles (AC: 5)
- [x] Frontend: add/administer Item Master CRUD UI with keyboard-first form flow and inline validation for required fields, enum types, and subtype fields where relevant (AC: 1, 2, 3)
- [x] Frontend: add Packaging Profile UI to create and maintain multi-component mappings with per-unit quantities and clear validation feedback (AC: 4)
- [x] Tests: add backend unit tests for item type validation, required-field enforcement, subtype rules, and packaging profile component constraints (AC: 1, 2, 3, 4)
- [x] Tests: add integration tests for item/profile persistence, FK integrity, and list/query discoverability behavior (AC: 4, 5)
- [x] Tests: add frontend component tests for Item Master and Packaging Profile forms, including validation error states and successful submit flows (AC: 1, 2, 3, 4)

### Review Follow-ups (AI)

- [x] [AI-Review][High] Derive authorization role from authenticated server-side context/session instead of trusting request `actor_role` (AC #5)
- [x] [AI-Review][High] Remove hardcoded `actor_role: "ADMIN"` from frontend master-data API calls and rely on server identity (AC #5)
- [x] [AI-Review][Med] Respect explicit `is_active=false` for packaging profile create path (AC #4)
- [x] [AI-Review][Med] Add integration test for non-existent `packing_material_item_id` rejection (AC #4)

## Windows Validation (WSL2 -> Windows Required)

- Script Path: `scripts/s2-1-win-test.ps1`
- Minimum Coverage:
  - Build the relevant application target(s)
  - Launch and validate runtime behavior for this story
  - Return non-zero exit code on failure
  - Print explicit PASS/FAIL summary

## Dev Notes

- Implement all business rules in backend domain/application layers first; frontend validation must mirror but not replace server-side enforcement for item type and required-field constraints. [Source: docs/tech-spec-epic-2.md#Services and Modules; docs/tech-spec-epic-2.md#Data Models and Contracts]
- Persist item masters with canonical base-unit metadata and enum-constrained type values to keep downstream calculations deterministic. [Source: docs/tech-spec-epic-2.md#Data Models and Contracts]
- Packaging profile components must only reference packing-material items and must remain normalized by per-unit quantity so later packing deduction can be atomic and auditable. [Source: docs/tech-spec-epic-2.md#Data Models and Contracts; docs/PRD.md#FR-009A: Composite Packing Consumption Profiles]
- Keep CRUD entry points role-aware for Admin and Data Entry Operator boundaries defined by PRD/RBAC baseline from Epic 1. [Source: docs/tech-spec-epic-2.md#Authorization interface expectations; docs/PRD.md#Role-Based Access Control (RBAC)]
- Ensure list/query methods expose active masters for later modules instead of duplicating item/profile lookup logic in downstream stories. [Source: docs/tech-spec-epic-2.md#Workflows and Sequencing; docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
- Testing guidance: prioritize validation and persistence edge cases (invalid enum, duplicate codes, invalid component references), then UI keyboard-first and inline validation behavior. [Source: docs/tech-spec-epic-2.md#Test Strategy Summary]

### Project Structure Notes

- Align implementation within existing backend layering (`internal/domain`, `internal/app`, `internal/infrastructure`) and frontend component/form structure under `frontend/src/components`. [Source: docs/architecture.md#Project Structure]
- Epic-to-architecture mapping expects master-data capabilities to live in domain models plus app command/query services; avoid bypassing application layer from UI bindings. [Source: docs/architecture.md#Epic to Architecture Mapping]
- Repository + migration pattern remains mandatory for schema evolution and integrity guarantees. [Source: docs/architecture.md#2. Database Pattern: Repository & embedded Migrations]

### References

- [Source: docs/tech-spec-epic-2.md#Overview]
- [Source: docs/tech-spec-epic-2.md#Detailed Design]
- [Source: docs/tech-spec-epic-2.md#Data Models and Contracts]
- [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
- [Source: docs/tech-spec-epic-2.md#Test Strategy Summary]
- [Source: docs/epics.md#Story 2.1: Item Master Management]
- [Source: docs/PRD.md#FR-009A: Composite Packing Consumption Profiles]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/architecture.md#Epic to Architecture Mapping]

## Dev Agent Record

### Context Reference

- docs/stories/2-1-item-master-management.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- 2026-02-25: Story drafted from Epic 2 tech spec, PRD, epics, and architecture docs.
- 2026-02-25: Plan for Task 1 - add ItemType enum and required-field validation in domain, add schema migration for `item_type`/`base_unit`/`item_subtype`, and update SQLite repository persistence with backward-compatible field mapping.
- 2026-02-25: Implemented master-data backend slice: new item master fields, domain validation, create/update/list app service contracts with validation-first flow, SQLite list/query support, and packaging profile persistence with component type guards.
- 2026-02-25: Added Wails App bindings for Create/Update/List Items and Create/List Packaging Profiles; wired inventory service into server startup.
- 2026-02-25: Added Item Master and Packaging Profile frontend forms, integrated workspace navigation/views, and added frontend component tests for validation and submit paths.
- 2026-02-25: Validation run completed - `go test ./...`, `npm run test:run`, `npm run lint`, and `npm run build` all passed in WSL environment.

### Completion Notes List

- Implemented item master contract fields (`item_type`, `base_unit`, `item_subtype`) with supported enum validation and backward-compatible normalization from legacy `category`/`unit`.
- Added migration set for item master schema evolution (`000004`) and packaging profile tables (`000005`) with component constraints and indexes.
- Delivered validation-first app-service methods with explicit service error payload shape, role-aware access checks, and list/query interfaces for downstream consumers.
- Implemented packaging profile persistence and transactional component checks enforcing assignable active `PACKING_MATERIAL` references.
- Added frontend Item Master CRUD and Packaging Profile management forms with inline validation, keyboard-friendly Antd flow, and list visibility.
- Added backend unit/integration tests and frontend component tests for validation and successful submit behavior.
- Added Windows validation script `scripts/s2-1-win-test.ps1` with automated probe scenario coverage (`item-master-packaging`).
- Resolved Senior Review findings: switched inventory authZ to token-derived server-side role resolution, removed client role claims, fixed packaging profile `is_active` persistence behavior, added missing FK-negative integration test, and expanded frontend boundary/authZ-regression tests.

### File List

- cmd/server/main.go (MODIFIED)
- cmd/story_automation_probe/main.go (MODIFIED)
- docs/sprint-status.yaml (MODIFIED)
- docs/stories/2-1-item-master-management.md (MODIFIED)
- frontend/src/App.tsx (MODIFIED)
- frontend/src/__tests__/AppLicenseStatus.test.tsx (MODIFIED)
- frontend/src/__tests__/AppNavigationBlocker.test.tsx (MODIFIED)
- frontend/src/__tests__/AppRecoveryMode.test.tsx (MODIFIED)
- frontend/src/components/forms/ItemMasterForm.tsx (NEW)
- frontend/src/components/forms/PackagingProfileForm.tsx (NEW)
- frontend/src/components/forms/__tests__/ItemMasterForm.test.tsx (NEW)
- frontend/src/components/forms/__tests__/PackagingProfileForm.test.tsx (NEW)
- frontend/src/services/masterDataApi.ts (NEW)
- internal/app/app.go (MODIFIED)
- internal/app/inventory/service.go (MODIFIED)
- internal/app/inventory/service_test.go (MODIFIED)
- internal/domain/inventory/entities.go (MODIFIED)
- internal/domain/inventory/entities_test.go (NEW)
- internal/domain/inventory/repository.go (MODIFIED)
- internal/infrastructure/db/migrations/000004_item_master_fields.down.sql (NEW)
- internal/infrastructure/db/migrations/000004_item_master_fields.up.sql (NEW)
- internal/infrastructure/db/migrations/000005_packaging_profiles.down.sql (NEW)
- internal/infrastructure/db/migrations/000005_packaging_profiles.up.sql (NEW)
- internal/infrastructure/db/migrations_test.go (MODIFIED)
- internal/infrastructure/db/sqlite_inventory_repository.go (MODIFIED)
- internal/infrastructure/db/sqlite_inventory_repository_test.go (MODIFIED)
- scripts/s2-1-win-test.ps1 (NEW)

### Windows Validation Script

`scripts/s2-1-win-test.ps1`

### Windows Validation Evidence

- Command: Not executed in this Linux/WSL session (script is Windows-targeted). Validation script added and ready: `powershell -ExecutionPolicy Bypass -File scripts/s2-1-win-test.ps1 -Mode user-auto`
- Result: Pending Windows execution
- Notes: Backend + frontend automated tests passed in WSL (`go test ./...`, `npm run test:run`, `npm run lint`, `npm run build`).

## Change Log

- 2026-02-25: Story drafted via create-story workflow.
- 2026-02-25: Implemented Story 2.1 item master and packaging profile backend/frontend slices, added migrations/tests, and marked story Ready for Review.
- 2026-02-25: Senior Developer Review notes appended.
- 2026-02-25: Addressed Senior Developer Review action items (authZ redesign, inactive-profile persistence fix, missing FK test, and expanded frontend/backend regression tests).

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-25

### Outcome

**Blocked** - A high-severity authorization flaw exists: backend trusts client-supplied role claims and frontend hardcodes `ADMIN`, which can permit privilege escalation.

### Summary

Story 2.1 implementation is substantially complete and acceptance-criteria coverage is strong with evidence across domain, service, repository, migrations, and frontend bindings/forms. However, the current authorization approach is not safe for production because role is caller-asserted instead of server-derived.

### Key Findings

#### HIGH

- Client-controlled role authorization allows effective privilege escalation.
  - Backend accepts request field `actor_role` and defaults missing role to `ADMIN`.
  - Frontend always sends `actor_role: "ADMIN"` for master-data calls.
  - Evidence: `internal/app/inventory/service.go:90-115`, `frontend/src/services/masterDataApi.ts:96`, `frontend/src/services/masterDataApi.ts:109`, `frontend/src/services/masterDataApi.ts:126`, `frontend/src/services/masterDataApi.ts:142`, `frontend/src/services/masterDataApi.ts:156`.

#### MEDIUM

- Packaging profile creation currently cannot intentionally persist `is_active=false`; repository forces active state.
  - Evidence: `internal/infrastructure/db/sqlite_inventory_repository.go:188-190`.
- Integration-test gap for explicit non-existent profile component FK path.
  - Wrong-type item check exists; explicit missing-ID negative path is not directly asserted.
  - Evidence: `internal/infrastructure/db/sqlite_inventory_repository_test.go:221-248`.

#### LOW

- Frontend form tests cover required-field and happy-submit paths but miss deeper edge cases (duplicate components, zero/negative qty boundary, update/edit behavior).
  - Evidence: `frontend/src/components/forms/__tests__/ItemMasterForm.test.tsx:34-50`, `frontend/src/components/forms/__tests__/PackagingProfileForm.test.tsx:44-60`.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Create item master with required fields and persist | IMPLEMENTED | `internal/domain/inventory/entities.go:92-103`, `internal/app/inventory/service.go:142-161`, `internal/infrastructure/db/sqlite_inventory_repository.go:36-39`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:141-173` |
| AC2 | Restrict `item_type` to supported categories and reject unsupported values | IMPLEMENTED | `internal/domain/inventory/entities.go:13-16`, `internal/domain/inventory/entities.go:35-41`, `internal/domain/inventory/entities.go:95-100`, `internal/app/inventory/service_test.go:122-144` |
| AC3 | Support packing-material subtype tags without changing stock ownership | IMPLEMENTED | `internal/domain/inventory/entities.go:52`, `internal/infrastructure/db/migrations/000004_item_master_fields.up.sql:3`, `internal/infrastructure/db/sqlite_inventory_repository.go:36-39`, `frontend/src/components/forms/ItemMasterForm.tsx:147-150`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:147-173` |
| AC4 | Support packaging profiles with multi-component mappings and per-unit qty | IMPLEMENTED | `internal/domain/inventory/entities.go:117-160`, `internal/infrastructure/db/sqlite_inventory_repository.go:227-239`, `internal/infrastructure/db/sqlite_inventory_repository.go:356-362`, `frontend/src/components/forms/PackagingProfileForm.tsx:108-143`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:277-303` |
| AC5 | Expose master data via list/query interfaces for downstream modules | IMPLEMENTED | `internal/app/inventory/service.go:208-218`, `internal/app/inventory/service.go:245-255`, `internal/infrastructure/db/sqlite_inventory_repository.go:79-133`, `internal/infrastructure/db/sqlite_inventory_repository.go:275-374`, `internal/app/app.go:392-415`, `internal/app/app.go:444-470` |

**Summary:** 5 of 5 ACs fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Implement Item Master domain and persistence contracts for required fields and supported type enums (AC: 1, 2) | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:85-106`, `internal/infrastructure/db/sqlite_inventory_repository.go:22-25` |
| Add create/update/list application service methods for item masters with validation-first flow and explicit error payloads (AC: 1, 2, 5) | [x] | VERIFIED COMPLETE | `internal/app/inventory/service.go:117-139`, `internal/app/inventory/service.go:142-218` |
| Extend item model and storage for optional `item_subtype` used by packing-material classification (AC: 3) | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:52`, `internal/infrastructure/db/migrations/000004_item_master_fields.up.sql:3`, `internal/infrastructure/db/sqlite_inventory_repository.go:36-39` |
| Implement packaging profile domain/persistence model and create/list service paths with component mapping (`packing_material_item_id`, `qty_per_unit`) (AC: 4) | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:117-160`, `internal/infrastructure/db/sqlite_inventory_repository.go:184-255`, `internal/infrastructure/db/sqlite_inventory_repository.go:275-374` |
| Enforce referential integrity and type constraints for packaging profile components so only active `PACKING_MATERIAL` items are assignable (AC: 4) | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:257-273`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:221-248` |
| Implement list/query endpoints used by downstream workflows to fetch active items and packaging profiles (AC: 5) | [x] | VERIFIED COMPLETE | `internal/app/app.go:392-415`, `internal/app/app.go:444-470`, `frontend/src/services/masterDataApi.ts:90-147` |
| Frontend: add/administer Item Master CRUD UI with keyboard-first form flow and inline validation for required fields, enum types, and subtype fields where relevant (AC: 1, 2, 3) | [x] | VERIFIED COMPLETE | `frontend/src/components/forms/ItemMasterForm.tsx:76-111`, `frontend/src/components/forms/ItemMasterForm.tsx:121-153`, `frontend/src/components/forms/ItemMasterForm.tsx:175-214` |
| Frontend: add Packaging Profile UI to create and maintain multi-component mappings with per-unit quantities and clear validation feedback (AC: 4) | [x] | VERIFIED COMPLETE | `frontend/src/components/forms/PackagingProfileForm.tsx:70-89`, `frontend/src/components/forms/PackagingProfileForm.tsx:108-147` |
| Tests: add backend unit tests for item type validation, required-field enforcement, subtype rules, and packaging profile component constraints (AC: 1, 2, 3, 4) | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities_test.go:8-113`, `internal/app/inventory/service_test.go:122-177` |
| Tests: add integration tests for item/profile persistence, FK integrity, and list/query discoverability behavior (AC: 4, 5) | [x] | QUESTIONABLE | `internal/infrastructure/db/sqlite_inventory_repository_test.go:141-303` (missing explicit non-existent FK component test) |
| Tests: add frontend component tests for Item Master and Packaging Profile forms, including validation error states and successful submit flows (AC: 1, 2, 3, 4) | [x] | VERIFIED COMPLETE | `frontend/src/components/forms/__tests__/ItemMasterForm.test.tsx:34-50`, `frontend/src/components/forms/__tests__/PackagingProfileForm.test.tsx:44-60` |

**Summary:** 10 of 11 completed tasks verified, 1 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Executed:
  - `go test ./internal/domain/inventory ./internal/app/inventory ./internal/infrastructure/db` (pass)
  - `npm run test:run -- src/components/forms/__tests__/ItemMasterForm.test.tsx src/components/forms/__tests__/PackagingProfileForm.test.tsx` (pass)
- Gaps:
  - Add explicit non-existent `packing_material_item_id` integration test for packaging profile creation.
  - Expand frontend form tests for additional edge/error cases.

### Architectural Alignment

- Layering is mostly respected (`domain` -> `app` -> `infrastructure`, frontend via app bindings).
- Critical misalignment remains in authZ boundary: role is payload-driven, not identity-driven from authenticated context.

### Security Notes

- High-risk authorization flaw from trusting client-provided role claim.
- SQL operations in reviewed paths use parameterized queries and transactional writes for profile/component creation.

### Best-Practices and References

- Go transaction patterns: https://go.dev/doc/database/execute-transactions
- Go SQL injection guidance: https://go.dev/doc/database/sql-injection
- SQLite foreign key behavior: https://www.sqlite.org/foreignkeys.html
- React controlled inputs: https://react.dev/reference/react-dom/components/input
- Ant Design Form docs: https://ant.design/components/form/
- Wails binding/runtime model: https://wails.io/docs/howdoesitwork/

### Action Items

**Code Changes Required:**
- [ ] [High] Derive authorization role from authenticated server-side context/session instead of trusting request `actor_role` (AC #5) [file: `internal/app/inventory/service.go:90-115`]
- [ ] [High] Remove hardcoded `actor_role: "ADMIN"` from frontend master-data API calls (AC #5) [file: `frontend/src/services/masterDataApi.ts:96`]
- [ ] [Med] Respect explicit `is_active=false` for packaging profile create path (AC #4) [file: `internal/infrastructure/db/sqlite_inventory_repository.go:188-190`]
- [ ] [Med] Add integration test for non-existent `packing_material_item_id` rejection (AC #4) [file: `internal/infrastructure/db/sqlite_inventory_repository_test.go:221`]

**Advisory Notes:**
- Note: Expand frontend tests to cover duplicate component rows, invalid quantity boundaries, and update/edit flow regressions.
- Note: Add backend authZ tests for forged client role payloads after role-source redesign.

### Resolution Addendum

- 2026-02-25: All review action items and advisory-test follow-ups were implemented and verified.
- AuthZ now derives role from server-side token resolution (no client role claim trust).
- Frontend master-data calls now pass `auth_token`; hardcoded `actor_role` usage removed.
- Packaging profile creation now preserves explicit `is_active=false`.
- Added integration coverage for non-existent `packing_material_item_id` rejection with rollback assertion.
- Expanded frontend tests for duplicate-component and quantity-boundary validation plus update/edit regression path.
- Added backend authZ regression test proving forged `actor_role` payloads are ignored.
