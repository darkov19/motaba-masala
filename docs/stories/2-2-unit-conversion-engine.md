# Story 2.2: Unit Conversion Engine

Status: done

## Story

As a Developer,
I want a deterministic unit conversion engine that converts operational quantities (for example grams) into canonical base units (for example KG),
so that inventory and production calculations remain accurate and auditable across workflows.

## Acceptance Criteria

1. The unit conversion engine converts usage quantities to base units accurately using configured conversion factors (for example `500 grams` converts to `0.5 KG`). [Source: docs/epics.md#Story 2.2: Unit Conversion Engine; docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
2. Conversion calculations enforce configured precision/rounding behavior and prevent rounding drift beyond the defined precision scale. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/tech-spec-epic-2.md#Data Models and Contracts]
3. Conversion logic is implemented in backend/domain services and consumed by workflows using canonical base-unit internal calculations (UI-only duplication is not allowed). [Source: docs/tech-spec-epic-2.md#Services and Modules; docs/tech-spec-epic-2.md#Data Models and Contracts; docs/architecture.md#Project Structure]
4. Conversion capabilities integrate without violating existing navigation/RBAC contract boundaries, with backend authorization remaining authoritative for protected operations. [Source: docs/epics.md#Story 2.2: Unit Conversion Engine; docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule); docs/tech-spec-epic-2.md#Security]

## Tasks / Subtasks

- [x] Implement backend/domain unit conversion service contract and core conversion flow (AC: 1, 3)
  - [x] Define conversion request/response model (source unit, target unit, quantity, precision metadata) in application/domain layer
  - [x] Implement factor-based conversion execution for supported units with canonical base-unit output path
  - [x] Integrate service usage into relevant master-data workflow boundary without duplicating conversion logic in UI code
- [x] Implement precision and rounding policy enforcement (AC: 2)
  - [x] Add precision-scale and rounding-mode handling to conversion computation path
  - [x] Enforce validation rules for invalid factors/precision inputs and return actionable errors
  - [x] Add deterministic rounding behavior tests for boundary values to prevent drift
- [x] Preserve authorization and RBAC boundaries for conversion operations (AC: 4)
  - [x] Ensure protected conversion-related operations use existing authenticated backend context/session
  - [x] Keep route/module contracts unchanged (`masters.*`) while wiring conversion capability
  - [x] Verify backend authorization remains authoritative for any conversion-management write path
- [x] Add automated test coverage for conversion accuracy, precision, and authorization boundaries (AC: 1, 2, 3, 4)
  - [x] Unit tests: conversion math scenarios (including `500 grams -> 0.5 KG`) and precision/rounding edge cases
  - [x] Integration tests: repository/service interactions for configured conversion rules and failure cases
  - [x] RBAC/authorization regression tests for denied write operations and trusted auth context handling
- [x] Add Windows validation automation for this story scope (AC: 1, 2, 3, 4)
  - [x] Create/update `scripts/s2-2-win-test.ps1` with PASS/FAIL summary and non-zero failure exit
  - [x] Include coverage for build/startup sanity and story-specific conversion behavior verification

## Windows Validation (WSL2 -> Windows Required)

- Script Path: `scripts/s2-2-win-test.ps1`
- Minimum Coverage:
  - Build the relevant application target(s)
  - Launch and validate runtime behavior for this story
  - Return non-zero exit code on failure
  - Print explicit PASS/FAIL summary

## Dev Notes

### Architecture Patterns and Constraints

- Implement conversion as a backend/domain service (`UnitConversionService`) inside the existing hexagonal layering; avoid UI-side duplicate business logic.
- Keep backend authorization as the canonical enforcement layer for any protected conversion-management actions.
- Maintain canonical base-unit internal calculations and treat UI unit displays/conversions as consumers of backend conversion contracts.

[Source: docs/tech-spec-epic-2.md#Services and Modules]
[Source: docs/tech-spec-epic-2.md#Data Models and Contracts]
[Source: docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]
[Source: docs/architecture.md#Project Structure]

### Requirements Context Summary

- Epic 2 requires standardized unit conversion between buying and usage units, with base-unit storage as the canonical calculation model. [Source: docs/epics.md#Story 2.2: Unit Conversion Engine; docs/PRD.md#Domain-Specific Requirements]
- The primary story target is accurate conversion behavior (for example `500 grams -> 0.5 KG`) with precision controls that avoid rounding drift in inventory math. [Source: docs/epics.md#Story 2.2: Unit Conversion Engine; docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
- Conversion behavior should be implemented as a backend/domain service and consumed by application workflows rather than duplicated in UI logic. [Source: docs/tech-spec-epic-2.md#Services and Modules; docs/architecture.md#Project Structure]
- Route/module identity and role constraints must remain aligned with the approved navigation contract while this story adds conversion capability to master-data workflows. [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths)]

### Structure Alignment Summary

- Previous story `2-2e-authentication-ux-session-lifecycle-admin-user-management` is `done` and establishes reusable auth/session plumbing (`internal/app/app.go`, `cmd/server/main.go`, `frontend/src/services/authApi.ts`, `frontend/src/services/masterDataApi.ts`) that should be reused for any new protected conversion endpoints rather than re-implemented. [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Completion Notes List; docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#File List]
- Previous-story architectural direction requires backend-authoritative authorization and trusted session-role resolution; this story must preserve that boundary while adding conversion behavior. [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Dev Notes; docs/architecture.md#0. Cohesive App Contract]
- No unresolved unchecked review action items were found in the predecessor story; follow-up items are already closed, so this story should proceed without inherited blockers. [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Action Items; docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Review Follow-ups (AI)]
- Epic 2 technical structure places conversion logic in a backend/domain service (`UnitConversionService`) and keeps UI as a consumer, which aligns with the existing hexagonal layering. [Source: docs/tech-spec-epic-2.md#Services and Modules; docs/architecture.md#Project Structure]

### Learnings from Previous Story

**From Story 2-2e-authentication-ux-session-lifecycle-admin-user-management (Status: done)**

- **Reusable service/binding assets:** Use existing authenticated app bindings and session handling pathways (`internal/app/app.go`, `cmd/server/main.go`) rather than introducing parallel auth plumbing for conversion operations.
- **Frontend service reuse:** Reuse established token/session behavior in `frontend/src/services/authApi.ts` and `frontend/src/services/masterDataApi.ts` for protected calls.
- **Architectural constraint to preserve:** Frontend guards are UX-only; backend authorization remains canonical and must enforce write protection for restricted roles.
- **Pending review risk check:** No unchecked action/follow-up items remain in the predecessor review section, so no inherited blocker is carried into this story.

[Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Completion Notes List]
[Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Dev Notes]
[Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Action Items]
[Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Review Follow-ups (AI)]

### Project Structure Notes

- Place conversion domain logic in backend domain/application layers (`internal/domain/*`, `internal/app/*`) and persistence/contracts in `internal/infrastructure/db/*`, consistent with current project structure and existing master-data service placement.
- Keep route/module naming unchanged (`masters.*` contract) and avoid adding parallel UI-only conversion logic outside established master-data service boundaries.
- No structure conflicts detected; `unified-project-structure.md` was not found in current docs, so alignment is based on `docs/architecture.md` and implemented code layout.

### Testing Standards Summary

- Add unit tests for conversion accuracy and precision/rounding edge cases to prevent drift regressions.
- Add integration tests for conversion rule resolution and invalid/missing-rule failure handling.
- Add RBAC/authorization regression tests confirming backend-denied behavior for restricted conversion-management writes.
- Keep story-specific Windows validation automation in `scripts/s2-2-win-test.ps1` with explicit PASS/FAIL and non-zero failure exit.

[Source: docs/tech-spec-epic-2.md#Test Strategy Summary]
[Source: docs/tech-spec-epic-2.md#Traceability Mapping]
[Source: docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]

### References

- [Source: docs/epics.md#Story 2.2: Unit Conversion Engine]
- [Source: docs/PRD.md#Domain-Specific Requirements]
- [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
- [Source: docs/tech-spec-epic-2.md#Services and Modules]
- [Source: docs/tech-spec-epic-2.md#Data Models and Contracts]
- [Source: docs/tech-spec-epic-2.md#Security]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/architecture.md#0. Cohesive App Contract]
- [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths)]
- [Source: docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]
- [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Completion Notes List]
- [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Dev Notes]
- [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Action Items]
- [Source: docs/stories/2-2e-authentication-ux-session-lifecycle-admin-user-management.md#Review Follow-ups (AI)]

## Dev Agent Record

### Context Reference

- docs/stories/2-2-unit-conversion-engine.context.xml

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-26: Planned implementation across domain conversion engine, persistence migration/repository methods, app/service/server bindings, and frontend master-data API integration while preserving existing `masters.*` route contracts.
- 2026-02-26: Added deterministic precision/rounding logic (`HALF_UP`, `DOWN`, `UP`) with decimal-rational computation to prevent drift on boundary values.
- 2026-02-26: Validation completed with `GOCACHE=/tmp/go-cache go test ./...`, `npm --prefix frontend run test:run`, and `npm --prefix frontend run lint`.

### Completion Notes List

- Implemented backend unit conversion contracts in domain and app layers, including conversion-rule create/list and quantity conversion request/result models with precision metadata.
- Added `unit_conversions` migration and SQLite repository support for rule persistence, item-specific lookup, global fallback behavior, and filtered listing.
- Wired conversion operations through app bindings and server API endpoints to ensure workflows consume backend conversion logic rather than duplicating logic in UI.
- Extended frontend `masterDataApi` with conversion-rule and conversion-quantity calls that use trusted auth-token flow.
- Added unit and integration coverage for conversion accuracy (`500 grams -> 0.5 KG`), precision/rounding boundaries, rule lookup failure behavior, and RBAC enforcement on conversion-rule writes.
- Added Windows validation automation script `scripts/s2-2-win-test.ps1` with build/runtime/test coverage modes and explicit PASS/FAIL reporting.

### File List

- internal/domain/inventory/conversion.go
- internal/domain/inventory/conversion_test.go
- internal/domain/inventory/repository.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- internal/app/app.go
- internal/infrastructure/db/migrations/000007_unit_conversions.up.sql
- internal/infrastructure/db/migrations/000007_unit_conversions.down.sql
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- internal/infrastructure/db/migrations_test.go
- cmd/server/api_server.go
- cmd/server/api_server_test.go
- frontend/src/services/masterDataApi.ts
- scripts/s2-2-win-test.ps1
- docs/sprint-status.yaml
- docs/stories/2-2-unit-conversion-engine.md

### Windows Validation Script

`scripts/s2-2-win-test.ps1`

### Windows Validation Evidence

- Command:
- Result:
- Notes:

## Change Log

- 2026-02-26: Initial draft created by create-story workflow for Story 2.2 from sprint backlog.
- 2026-02-26: Implemented backend unit conversion engine with precision/rounding policies, persistence rules, API bindings, frontend service integration, and automated test coverage for Story 2.2.
- 2026-02-26: Story moved to review after passing backend regression and frontend lint/test validation.
- 2026-02-26: Senior Developer Review notes appended.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-26

### Outcome

Approve - All 4 acceptance criteria were verified with implementation evidence, all 19 completed tasks/subtasks were verified as actually implemented, and no High/Medium severity defects were found.

### Summary

The conversion engine is implemented as backend/domain logic with deterministic precision handling, persisted conversion rules, API/binding integration, and passing regression coverage. RBAC boundaries are preserved for conversion-rule writes via backend authorization, and frontend integration consumes backend conversion methods without UI-side conversion formulas.

### Key Findings

#### HIGH

- None.

#### MEDIUM

- None.

#### LOW

- API test coverage for conversion routes currently validates the convert error path, but does not include explicit success-path contract tests for conversion create/list routes. Evidence: `cmd/server/api_server_test.go:313`.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Convert usage quantities to base units accurately using configured factors (`500 grams -> 0.5 KG`). | IMPLEMENTED | `internal/domain/inventory/conversion.go:205`, `internal/domain/inventory/conversion.go:227`, `internal/domain/inventory/conversion_test.go:107`, `internal/domain/inventory/conversion_test.go:125`, `internal/app/inventory/service_test.go:373`, `internal/app/inventory/service_test.go:397` |
| AC2 | Enforce precision/rounding behavior and prevent drift beyond configured scale. | IMPLEMENTED | `internal/domain/inventory/conversion.go:90`, `internal/domain/inventory/conversion.go:255`, `internal/infrastructure/db/migrations/000007_unit_conversions.up.sql:7`, `internal/infrastructure/db/migrations/000007_unit_conversions.up.sql:8`, `internal/domain/inventory/conversion_test.go:132` |
| AC3 | Implement conversion in backend/domain services and consume via workflow boundaries (no UI-only duplication). | IMPLEMENTED | `internal/app/inventory/service.go:410`, `internal/app/inventory/service.go:448`, `internal/app/app.go:914`, `cmd/server/api_server.go:402`, `frontend/src/services/masterDataApi.ts:261` |
| AC4 | Preserve navigation/RBAC boundaries with backend authorization authoritative for protected operations. | IMPLEMENTED | `internal/app/inventory/service.go:169`, `internal/app/inventory/service.go:369`, `internal/app/inventory/service.go:411`, `internal/app/inventory/service_test.go:324`, `internal/app/inventory/service_test.go:348`, `frontend/src/shell/rbac.ts:20`, `frontend/src/shell/rbac.ts:80` |

Summary: 4 of 4 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Implement backend/domain unit conversion service contract and core conversion flow (AC: 1, 3) | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:48`, `internal/app/inventory/service.go:369`, `internal/app/inventory/service.go:410` |
| Define conversion request/response model in application/domain layer | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:154`, `internal/domain/inventory/conversion.go:197`, `internal/app/inventory/service.go:88`, `internal/app/inventory/service.go:107` |
| Implement factor-based conversion execution with canonical base-unit output path | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:205`, `internal/domain/inventory/conversion.go:227`, `internal/domain/inventory/conversion.go:232` |
| Integrate service usage into master-data workflow boundary without UI duplication | Completed | VERIFIED COMPLETE | `internal/app/app.go:914`, `cmd/server/api_server.go:402`, `frontend/src/services/masterDataApi.ts:261` |
| Implement precision and rounding policy enforcement (AC: 2) | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:90`, `internal/domain/inventory/conversion.go:255`, `internal/infrastructure/db/migrations/000007_unit_conversions.up.sql:7` |
| Add precision-scale and rounding-mode handling | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:54`, `internal/domain/inventory/conversion.go:55`, `internal/domain/inventory/conversion.go:260` |
| Enforce validation rules for invalid factors/precision with actionable errors | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion.go:87`, `internal/domain/inventory/conversion.go:90`, `internal/app/inventory/service.go:203`, `internal/app/inventory/service.go:210` |
| Add deterministic rounding behavior tests for boundary values | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion_test.go:132`, `internal/domain/inventory/conversion_test.go:145`, `internal/domain/inventory/conversion_test.go:161` |
| Preserve authorization and RBAC boundaries for conversion operations (AC: 4) | Completed | VERIFIED COMPLETE | `internal/app/inventory/service.go:169`, `internal/app/inventory/service.go:369`, `internal/app/inventory/service.go:411` |
| Ensure protected conversion-related operations use authenticated backend context/session | Completed | VERIFIED COMPLETE | `internal/app/inventory/service.go:122`, `internal/app/inventory/service.go:124`, `internal/app/inventory/service.go:147` |
| Keep route/module contracts unchanged (`masters.*`) while wiring conversion capability | Completed | VERIFIED COMPLETE | `frontend/src/shell/rbac.ts:20`, `frontend/src/shell/rbac.ts:21`, `frontend/src/shell/rbac.ts:22` |
| Verify backend authorization remains authoritative for conversion-management write path | Completed | VERIFIED COMPLETE | `internal/app/inventory/service.go:174`, `internal/app/inventory/service_test.go:324`, `internal/app/inventory/service_test.go:348` |
| Add automated test coverage for conversion accuracy, precision, and authorization boundaries (AC: 1, 2, 3, 4) | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion_test.go:107`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:456`, `internal/app/inventory/service_test.go:324` |
| Unit tests for conversion math (`500 grams -> 0.5 KG`) and precision edges | Completed | VERIFIED COMPLETE | `internal/domain/inventory/conversion_test.go:109`, `internal/domain/inventory/conversion_test.go:125`, `internal/domain/inventory/conversion_test.go:140` |
| Integration tests for repository/service conversion rules and failure cases | Completed | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository_test.go:456`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:523`, `internal/app/inventory/service_test.go:405` |
| RBAC/authorization regression tests for denied writes and trusted auth context handling | Completed | VERIFIED COMPLETE | `internal/app/inventory/service_test.go:324`, `internal/app/inventory/service_test.go:348`, `internal/app/inventory/service_test.go:360` |
| Add Windows validation automation for story scope (AC: 1, 2, 3, 4) | Completed | VERIFIED COMPLETE | `scripts/s2-2-win-test.ps1:1`, `scripts/s2-2-win-test.ps1:90`, `scripts/s2-2-win-test.ps1:95` |
| Create/update `scripts/s2-2-win-test.ps1` with PASS/FAIL summary and non-zero failure exit | Completed | VERIFIED COMPLETE | `scripts/s2-2-win-test.ps1:90`, `scripts/s2-2-win-test.ps1:91`, `scripts/s2-2-win-test.ps1:95`, `scripts/s2-2-win-test.ps1:96` |
| Include build/startup sanity and story-specific conversion behavior verification | Completed | VERIFIED COMPLETE | `scripts/s2-2-win-test.ps1:55`, `scripts/s2-2-win-test.ps1:67`, `scripts/s2-2-win-test.ps1:79` |

**Falsely marked complete tasks:** None found.

Summary: 19 of 19 completed tasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Verified execution:
  - `GOCACHE=/tmp/go-cache go test ./internal/domain/inventory ./internal/app/inventory ./internal/infrastructure/db ./cmd/server` (pass)
  - `npm --prefix frontend run lint` (pass)
  - `npm --prefix frontend run test:run` (pass)
- AC-to-test mapping:
  - AC1/AC2: `internal/domain/inventory/conversion_test.go`, `internal/app/inventory/service_test.go`
  - AC1/AC2/AC3: `internal/infrastructure/db/sqlite_inventory_repository_test.go`
  - AC4: `internal/app/inventory/service_test.go` (operator denied + forged actor role ignored)
- Gap:
  - No explicit success-path API tests for conversion create/list/convert response contracts in `cmd/server/api_server_test.go`.

### Architectural Alignment

- Aligns with Epic 2 technical spec for a backend/domain `UnitConversionService` and base-unit internal conversion model.
- Persistence contract aligns with planned `unit_conversions` table and deterministic precision fields.
- Navigation contract remains aligned with `masters.*` route identities (no route identity drift detected).

### Security Notes

- Backend authorization remains authoritative:
  - Write operations for conversion-rule management are admin-only (`requireMasterWriteAccess`).
  - Reads/conversion use authenticated role resolution and token checks.
- Service tests validate denial for operator writes and ignore forged `actor_role` payload fields.

### Best-Practices and References

- Go precise arithmetic and rational handling (`math/big`): https://pkg.go.dev/math/big
- SQLite constraints/indexing patterns for integrity: https://www.sqlite.org/lang_createtable.html
- Wails application architecture and bindings: https://wails.io/docs/
- OWASP ASVS baseline for authorization and input-validation controls: https://owasp.org/www-project-application-security-verification-standard/

### Action Items

**Code Changes Required:**
- [ ] None.

**Advisory Notes:**
- Note: Consider adding success-path API contract tests for `/inventory/conversions/rules/create`, `/inventory/conversions/rules/list`, and `/inventory/conversions/convert` in `cmd/server/api_server_test.go`.
