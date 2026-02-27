# Story 2.4: Supplier & Customer Masters

Status: done

## Story

As an Admin,
I want to create and maintain supplier and customer master records with the required contact and lead-time fields,
so that procurement and sales flows can reference validated parties consistently.

## Acceptance Criteria

1. Supplier master records can be created and updated with contact details and optional lead-time metadata. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/epics.md#Story 2.4: Supplier & Customer Masters]
2. Customer master records can be created and updated with contact details. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/epics.md#Story 2.4: Supplier & Customer Masters]
3. Party persistence enforces `party_type` domain validity (`SUPPLIER` or `CUSTOMER`) and returns actionable validation errors for invalid/duplicate requests. [Source: docs/tech-spec-epic-2.md#Data Models and Contracts; docs/tech-spec-epic-2.md#APIs and Interfaces]
4. Party master data is discoverable through list/query interfaces for downstream inbound/outbound workflows. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/tech-spec-epic-2.md#Workflows and Sequencing]
5. Route/module behavior for this story remains aligned to the canonical `masters.parties` contract and backend-authoritative RBAC enforcement. [Source: docs/epics.md#Story 2.4: Supplier & Customer Masters; docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths); docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]

## Tasks / Subtasks

- [x] Implement party master domain contracts and validation rules (AC: 1, 2, 3)
    - [x] Define supplier/customer create-update-list DTOs with required contact fields and optional supplier lead time
    - [x] Enforce `party_type` enum and duplicate/invalid payload validation behavior
- [x] Implement party persistence and migration-safe storage behavior (AC: 1, 2, 3, 4)
    - [x] Add or verify `parties` schema and constraints aligned to Epic 2 contract
    - [x] Implement repository create/update/list flows using rollback-safe transaction handling patterns
- [x] Implement service + API + binding flow under existing masters module seams (AC: 1, 2, 4, 5)
    - [x] Add application service methods for `CreateParty`, `UpdateParty`, and `ListParties` with backend authorization checks
    - [x] Wire server API/bindings and frontend API service calls for `masters.parties` without introducing new module identities
- [x] Implement `masters.parties` UI behavior by role contract (AC: 1, 2, 4, 5)
    - [x] Admin UX supports supplier/customer create and edit flows
    - [x] Operator UX remains list/read-only, with backend-denied handling for write attempts
- [x] Add automated tests mapped to acceptance criteria (AC: 1, 2, 3, 4, 5)
    - [x] Unit tests for enum/required-field/contact validation rules
    - [x] Integration tests for constraints, duplicate handling, and transactional failure safety
    - [x] API contract tests for create/update/list success + error paths and role-denial behavior
    - [x] Frontend tests for `masters.parties` form/list behavior and role-aware UI constraints
- [x] Add Windows validation automation for this story (AC: 1, 2, 3, 4, 5)
    - [x] Create `scripts/s2-4-win-test.ps1` with build/runtime checks and explicit PASS/FAIL output
    - [x] Ensure script returns non-zero exit code on failure
- [x] Review Follow-ups (AI)
    - [x] [AI-Review][High] Add missing party API contract tests for update-success, list-success, and explicit operator write-denial mapping (AC #5)
    - [x] [AI-Review][Med] Add explicit party read-only UI test asserting operator mode hides create/edit controls while list remains accessible (AC #5)

## Windows Validation (WSL2 -> Windows Required)

- Script Path: `scripts/s2-4-win-test.ps1`
- Minimum Coverage:
    - Build the relevant application target(s)
    - Launch and validate runtime behavior for this story
    - Return non-zero exit code on failure
    - Print explicit PASS/FAIL summary

## Dev Notes

### Architecture Patterns and Constraints

- Implement supplier/customer master logic in backend domain/application layers (`internal/domain`, `internal/app`) and keep validation/authorization server-authoritative under the existing hexagonal structure. [Source: docs/architecture.md#Project Structure; docs/architecture.md#0. Cohesive App Contract]
- Use Epic 2 party interfaces as the implementation contract: `PartyService.CreateParty(input)` and `PartyService.ListParties(filter)` with typed request validation and duplicate-handling behavior. [Source: docs/tech-spec-epic-2.md#APIs and Interfaces; docs/tech-spec-epic-2.md#Services and Modules]
- Route/module ownership must stay on `masters.parties` without introducing alternate route identities. [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths); docs/navigation-rbac-contract.md#Module Naming and Route Ownership]
- RBAC enforcement for master writes must remain backend-denied for operator role and backend-allowed for admin role. [Source: docs/navigation-rbac-contract.md#RBAC Contract: Role x Module x Action Matrix; docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]

### Requirements Context Summary

- Story 2.4 requires CRUD-oriented master data support for suppliers and customers so procurement and sales flows can link transactions to named parties. [Source: docs/epics.md#Story 2.4: Supplier & Customer Masters]
- Epic 2 authoritative criteria for this story are supplier create/update with contact + optional lead time and customer create/update with contact details, with downstream discoverability through list/query interfaces. [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative); docs/tech-spec-epic-2.md#Traceability Mapping]
- Technical interfaces for this scope are centered on `PartyService.CreateParty` and `PartyService.ListParties`, with validation and duplicate-name policy handling defined in Epic 2 APIs. [Source: docs/tech-spec-epic-2.md#APIs and Interfaces]
- RBAC and route constraints must remain aligned to the canonical `masters.parties` contract and backend-authoritative authorization model. [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths); docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]

### Structure Alignment Summary

- Story 2.3 expanded shared inventory-service and API surfaces (`internal/app/inventory/service.go`, `cmd/server/api_server.go`, `frontend/src/services/masterDataApi.ts`), so Story 2.4 should extend these existing seams for party master operations instead of creating parallel service paths. [Source: docs/stories/2-3-recipe-bom-management.md#File List; docs/stories/2-3-recipe-bom-management.md#Completion Notes List]
- Previous story review artifacts still show two unchecked high-priority action items (rollback safety pattern and API success-path contract completeness); Story 2.4 implementation should proactively follow rollback-safe transaction handling and explicit success+error API testing standards across new party endpoints. [Source: docs/stories/2-3-recipe-bom-management.md#Action Items]
- Epic-to-architecture mapping places master-data work in backend domain/app and infrastructure adapters, with frontend continuing through shared shell/module routing contracts. [Source: docs/architecture.md#Epic to Architecture Mapping; docs/architecture.md#0. Cohesive App Contract]

### Learnings from Previous Story

**From Story 2-3-recipe-bom-management (Status in sprint-status: done)**

- **Reusable implementation seams:** Extend `internal/app/inventory/service.go`, `cmd/server/api_server.go`, and `frontend/src/services/masterDataApi.ts` for party master flows instead of creating new parallel service entry points.
- **Data-access pattern to reuse:** Continue repository + migration-first implementation in `internal/infrastructure/db/sqlite_inventory_repository.go` and `internal/infrastructure/db/migrations/*`.
- **Testing baseline to reuse:** Keep API contract tests in `cmd/server/api_server_test.go` and repository/service tests in existing inventory test suites.
- **Pending review items to carry forward:** The previous story still has unchecked high-priority action items for rollback-safety rigor and update/list API success-path coverage; ensure these patterns are satisfied by default in this story's changes.
- **Windows validation pattern:** Follow story-scoped script convention established by `scripts/s2-3-win-test.ps1` when creating `scripts/s2-4-win-test.ps1`.

[Source: docs/sprint-status.yaml#development_status]
[Source: docs/stories/2-3-recipe-bom-management.md#Completion Notes List]
[Source: docs/stories/2-3-recipe-bom-management.md#File List]
[Source: docs/stories/2-3-recipe-bom-management.md#Action Items]
[Source: docs/stories/2-3-recipe-bom-management.md#Windows Validation Script]

### Project Structure Notes

- Backend:
    - Extend party domain contracts in `internal/domain/inventory/*`.
    - Implement service orchestration in `internal/app/inventory/service.go`.
    - Add persistence/migration changes under `internal/infrastructure/db` and `internal/infrastructure/db/migrations`.
- API/bindings:
    - Extend server API/binding paths in `cmd/server/api_server.go` and app bindings in `internal/app/app.go`.
- Frontend:
    - Keep party master UX/data access under existing masters shell paths in `frontend/src/components/forms` and `frontend/src/services`.
- No structure conflict detected with current architecture guidance; follow existing masters module boundaries.

### Testing Standards Summary

- Unit tests for party field validation, enum handling, and duplicate-policy behavior. [Source: docs/tech-spec-epic-2.md#Test Strategy Summary; docs/tech-spec-epic-2.md#Data Models and Contracts]
- Integration tests for transactional create/update behavior and persistence constraints. [Source: docs/tech-spec-epic-2.md#Test Strategy Summary; docs/tech-spec-epic-2.md#Reliability/Availability]
- API contract tests for create/update/list success and error paths, including unauthorized/forbidden behavior by role. [Source: docs/tech-spec-epic-2.md#APIs and Interfaces; docs/navigation-rbac-contract.md#RBAC Contract: Role x Module x Action Matrix]
- Frontend tests for role-aware `masters.parties` visibility and form/list behavior. [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths); docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]

### References

- [Source: docs/epics.md#Story 2.4: Supplier & Customer Masters]
- [Source: docs/PRD.md#Functional Requirements]
- [Source: docs/PRD.md#Data Integrity & Security]
- [Source: docs/tech-spec-epic-2.md#Services and Modules]
- [Source: docs/tech-spec-epic-2.md#Data Models and Contracts]
- [Source: docs/tech-spec-epic-2.md#APIs and Interfaces]
- [Source: docs/tech-spec-epic-2.md#Workflows and Sequencing]
- [Source: docs/tech-spec-epic-2.md#Acceptance Criteria (Authoritative)]
- [Source: docs/tech-spec-epic-2.md#Test Strategy Summary]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/architecture.md#Epic to Architecture Mapping]
- [Source: docs/architecture.md#0. Cohesive App Contract]
- [Source: docs/navigation-rbac-contract.md#Canonical Route Map (Stable IDs and Paths)]
- [Source: docs/navigation-rbac-contract.md#Module Naming and Route Ownership]
- [Source: docs/navigation-rbac-contract.md#RBAC Contract: Role x Module x Action Matrix]
- [Source: docs/navigation-rbac-contract.md#Frontend vs Backend Authority (Canonical Rule)]
- [Source: docs/sprint-status.yaml#development_status]
- [Source: docs/stories/2-3-recipe-bom-management.md#Completion Notes List]
- [Source: docs/stories/2-3-recipe-bom-management.md#File List]
- [Source: docs/stories/2-3-recipe-bom-management.md#Action Items]

## Dev Agent Record

### Context Reference

- `docs/stories/2-4-supplier-customer-masters.context.xml`

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-26: Planned implementation sequence - (1) add party domain + migration + repository contract, (2) wire service/app/server API create-update-list flow with backend RBAC checks, (3) implement `masters.parties` UI and route view binding, (4) add domain/service/repository/API/frontend tests, (5) add Windows story validation script.
- 2026-02-26: Completed regression validation in WSL - `GOCACHE=/tmp/go-build-cache go test ./...`, `npm --prefix frontend run test:run`, and `npm --prefix frontend run lint` (all passing).
- 2026-02-27: Addressed senior-review gaps by adding missing party API contract tests (`update` success, `list` success, and create forbidden mapping) and explicit party read-only UI test coverage for operator mode.

### Completion Notes List

- Implemented new party master domain with explicit supplier/customer type validation, contact requirements, optional supplier lead-time semantics, and actionable validation errors.
- Added `parties` persistence with migration `000009_parties` and rollback-safe repository create/update/list flows including duplicate policy and concurrency conflict handling.
- Extended application service, app bindings, and server API contracts with `CreateParty`, `UpdateParty`, and `ListParties`; kept backend authorization authoritative (admin writes, operator read-only).
- Wired frontend `masters.parties` into a real master split view (`party-master`) with admin create/edit UX, operator read-only UX, search/list query support, and automated frontend tests.
- Added `scripts/s2-4-win-test.ps1` to satisfy story-scoped Windows validation automation contract (build/run/test checks with explicit PASS/FAIL and non-zero exit on failure).
- Resolved Senior Developer Review action items by completing missing party API contract test matrix and adding explicit operator read-only UI test assertions.

### File List

- cmd/server/api_server.go
- cmd/server/api_server_test.go
- frontend/src/App.css
- frontend/src/App.tsx
- frontend/src/**tests**/AppShellRBAC.test.tsx
- frontend/src/components/forms/PartyMasterForm.tsx
- frontend/src/components/forms/**tests**/PartyMasterForm.test.tsx
- frontend/src/components/forms/**tests**/RecipeForm.test.tsx
- frontend/src/services/masterDataApi.ts
- frontend/src/shell/rbac.ts
- internal/app/app.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- internal/domain/inventory/party.go
- internal/domain/inventory/party_test.go
- internal/domain/inventory/repository.go
- internal/infrastructure/db/migrations/000009_parties.down.sql
- internal/infrastructure/db/migrations/000009_parties.up.sql
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- scripts/s2-4-win-test.ps1

### Windows Validation Script

`scripts/s2-4-win-test.ps1`

### Windows Validation Evidence

- Command: `powershell -ExecutionPolicy Bypass -File scripts/s2-4-win-test.ps1 -Mode user-auto`
- Result: Pending Windows host execution
- Notes: Script is contract-complete (build/runtime/go-test/frontend-test checks + explicit PASS/FAIL summary + non-zero failure exit); Windows runtime execution still needs to be run on a Windows host and recorded.

## Change Log

- 2026-02-26: Initial draft created by create-story workflow for Story 2.4 from sprint backlog.
- 2026-02-26: Implemented supplier/customer master domain, migration-safe persistence, service/app/API contracts, and `masters.parties` UI with backend-authoritative RBAC enforcement.
- 2026-02-26: Added party-focused automated test coverage (domain, repository, service, server API, and frontend form flows) and completed Go/frontend regression runs.
- 2026-02-26: Added `scripts/s2-4-win-test.ps1` for story-scoped Windows validation automation.
- 2026-02-26: Senior Developer Review notes appended (Outcome: Blocked).
- 2026-02-27: Fixed review follow-up test gaps and validated with `GOCACHE=/tmp/go-build-cache go test ./cmd/server` and `npm --prefix frontend run test:run -- src/components/forms/__tests__/PartyMasterForm.test.tsx`.

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-26

### Outcome

**Blocked** - one completed task is marked done but is not fully implemented as specified.

### Summary

Implementation quality is strong and all acceptance criteria are implemented with concrete backend/frontend evidence. However, task validation found one **falsely completed** item: API contract tests do not yet cover create/update/list **success + error** and role-denial paths as claimed in the story task.

### Key Findings

#### HIGH

- **Task marked complete but not fully implemented:** `API contract tests for create/update/list success + error paths and role-denial behavior` is checked complete, but party API tests currently cover create-success, update-error, and list-unauthorized only; they do not cover update-success and list-success paths, and do not explicitly verify operator-forbidden write mapping at API layer. Evidence: `cmd/server/api_server_test.go:549`, `cmd/server/api_server_test.go:589`, `cmd/server/api_server_test.go:607`.

#### MEDIUM

- No additional medium findings.

#### LOW

- Windows execution evidence remains pending in-story despite script completeness; run on native Windows host and capture output. Evidence: `docs/stories/2-4-supplier-customer-masters.md:184`.

### Acceptance Criteria Coverage

| AC# | Description                                                                                         | Status      | Evidence                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Supplier master records can be created/updated with contact details and optional lead-time metadata | IMPLEMENTED | `internal/domain/inventory/party.go:41`, `internal/app/inventory/service.go:613`, `internal/infrastructure/db/sqlite_inventory_repository.go:756`, `frontend/src/components/forms/PartyMasterForm.tsx:112`                                                       |
| AC2 | Customer master records can be created/updated with contact details                                 | IMPLEMENTED | `internal/domain/inventory/party.go:15`, `internal/app/inventory/service.go:636`, `frontend/src/components/forms/PartyMasterForm.tsx:235`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:842`                                                  |
| AC3 | Persistence enforces `party_type` validity and actionable invalid/duplicate errors                  | IMPLEMENTED | `internal/infrastructure/db/migrations/000009_parties.up.sql:3`, `internal/domain/inventory/party.go:72`, `internal/app/inventory/service.go:287`, `internal/app/inventory/service.go:401`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:876` |
| AC4 | Party data discoverable via list/query interfaces                                                   | IMPLEMENTED | `internal/app/inventory/service.go:673`, `cmd/server/api_server.go:469`, `frontend/src/services/masterDataApi.ts:358`, `frontend/src/components/forms/PartyMasterForm.tsx:69`, `internal/infrastructure/db/sqlite_inventory_repository.go:841`                   |
| AC5 | Behavior aligned with `masters.parties` and backend-authoritative RBAC                              | IMPLEMENTED | `frontend/src/shell/rbac.ts:22`, `frontend/src/App.tsx:636`, `internal/app/inventory/service.go:614`, `internal/app/inventory/service_test.go:523`                                                                                                               |

**AC Coverage Summary:** 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                                                                                 | Marked As | Verified As       | Evidence                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implement party master domain contracts and validation rules (AC: 1,2,3)                             | [x]       | VERIFIED COMPLETE | `internal/domain/inventory/party.go:11`, `internal/domain/inventory/party.go:65`                                                                                                                                                                                 |
| Define supplier/customer create-update-list DTOs with required contact + optional supplier lead time | [x]       | VERIFIED COMPLETE | `internal/app/inventory/service.go:123`, `frontend/src/services/masterDataApi.ts:108`, `internal/domain/inventory/party.go:48`                                                                                                                                   |
| Enforce `party_type` enum and duplicate/invalid payload validation behavior                          | [x]       | VERIFIED COMPLETE | `internal/domain/inventory/party.go:72`, `internal/infrastructure/db/migrations/000009_parties.up.sql:3`, `internal/app/inventory/service.go:401`                                                                                                                |
| Implement party persistence and migration-safe storage behavior (AC: 1,2,3,4)                        | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/migrations/000009_parties.up.sql:1`, `internal/infrastructure/db/sqlite_inventory_repository.go:732`                                                                                                                                 |
| Add/verify `parties` schema and constraints aligned to Epic 2 contract                               | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/migrations/000009_parties.up.sql:3`, `internal/infrastructure/db/migrations/000009_parties.up.sql:15`                                                                                                                                |
| Implement repository create/update/list flows using rollback-safe transaction patterns               | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:743`, `internal/infrastructure/db/sqlite_inventory_repository.go:793`, `internal/infrastructure/db/sqlite_inventory_repository.go:841`                                                                |
| Implement service + API + binding flow under existing masters seams (AC: 1,2,4,5)                    | [x]       | VERIFIED COMPLETE | `internal/app/inventory/service.go:613`, `internal/app/app.go:995`, `cmd/server/api_server.go:429`                                                                                                                                                               |
| Add app service methods CreateParty/UpdateParty/ListParties with backend auth checks                 | [x]       | VERIFIED COMPLETE | `internal/app/inventory/service.go:614`, `internal/app/inventory/service.go:637`, `internal/app/inventory/service.go:674`                                                                                                                                        |
| Wire server API/bindings + frontend service calls for `masters.parties` contract                     | [x]       | VERIFIED COMPLETE | `cmd/server/api_server.go:429`, `internal/app/app.go:995`, `frontend/src/services/masterDataApi.ts:379`                                                                                                                                                          |
| Implement `masters.parties` UI behavior by role contract (AC: 1,2,4,5)                               | [x]       | VERIFIED COMPLETE | `frontend/src/components/forms/PartyMasterForm.tsx:28`, `frontend/src/App.tsx:636`, `frontend/src/shell/rbac.ts:22`                                                                                                                                              |
| Admin UX supports supplier/customer create and edit flows                                            | [x]       | VERIFIED COMPLETE | `frontend/src/components/forms/PartyMasterForm.tsx:140`, `frontend/src/components/forms/PartyMasterForm.tsx:118`, `frontend/src/components/forms/PartyMasterForm.tsx:197`                                                                                        |
| Operator UX remains list/read-only; backend-denied on write attempts                                 | [x]       | VERIFIED COMPLETE | `frontend/src/components/forms/PartyMasterForm.tsx:153`, `frontend/src/components/forms/PartyMasterForm.tsx:191`, `internal/app/inventory/service_test.go:523`                                                                                                   |
| Add automated tests mapped to acceptance criteria (AC: 1,2,3,4,5)                                    | [x]       | QUESTIONABLE      | Strong coverage exists, but API contract matrix is incomplete for one subtask. Evidence in rows below.                                                                                                                                                           |
| Unit tests for enum/required-field/contact validation rules                                          | [x]       | VERIFIED COMPLETE | `internal/domain/inventory/party_test.go:8`                                                                                                                                                                                                                      |
| Integration tests for constraints, duplicate handling, transactional failure safety                  | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository_test.go:829`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:876`, `internal/infrastructure/db/sqlite_inventory_repository_test.go:908`                                                 |
| **API contract tests for create/update/list success + error paths and role-denial behavior**         | [x]       | **NOT DONE**      | `cmd/server/api_server_test.go:549` (create success), `cmd/server/api_server_test.go:589` (update error), `cmd/server/api_server_test.go:607` (list unauthorized) but missing update-success, list-success, and explicit operator-forbidden write mapping tests. |
| Frontend tests for `masters.parties` form/list behavior and role-aware UI constraints                | [x]       | VERIFIED COMPLETE | `frontend/src/components/forms/__tests__/PartyMasterForm.test.tsx:33`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105`                                                                                                                                        |
| Add Windows validation automation for this story (AC: 1,2,3,4,5)                                     | [x]       | VERIFIED COMPLETE | `scripts/s2-4-win-test.ps1:1`                                                                                                                                                                                                                                    |
| Create `scripts/s2-4-win-test.ps1` with build/runtime checks and explicit PASS/FAIL output           | [x]       | VERIFIED COMPLETE | `scripts/s2-4-win-test.ps1:65`, `scripts/s2-4-win-test.ps1:75`, `scripts/s2-4-win-test.ps1:112`                                                                                                                                                                  |
| Ensure script returns non-zero exit code on failure                                                  | [x]       | VERIFIED COMPLETE | `scripts/s2-4-win-test.ps1:115`                                                                                                                                                                                                                                  |

**Task Summary:** 19 of 20 completed tasks verified, 0 questionable, **1 falsely marked complete**.

### Test Coverage and Gaps

- Executed and passing in this review:
    - `GOCACHE=/tmp/go-build-cache go test ./internal/domain/inventory ./internal/app/inventory ./internal/infrastructure/db ./cmd/server`
    - `npm --prefix frontend run test:run -- src/components/forms/__tests__/PartyMasterForm.test.tsx src/__tests__/AppShellRBAC.test.tsx`
- Coverage present:
    - Domain validation tests: `internal/domain/inventory/party_test.go:8`
    - Repository create/list/duplicate/concurrency tests: `internal/infrastructure/db/sqlite_inventory_repository_test.go:829`
    - Service RBAC + validation mapping tests: `internal/app/inventory/service_test.go:499`
    - Frontend form + shell RBAC tests: `frontend/src/components/forms/__tests__/PartyMasterForm.test.tsx:33`, `frontend/src/__tests__/AppShellRBAC.test.tsx:105`
- Gap:
    - Party API contract tests are incomplete versus claimed scope (missing update/list success-path and explicit write-denial mapping tests).

### Architectural Alignment

- Aligned with hexagonal seams and existing module ownership:
    - Domain/app/infrastructure layering preserved: `internal/domain/inventory/party.go:11`, `internal/app/inventory/service.go:613`, `internal/infrastructure/db/sqlite_inventory_repository.go:732`
    - Canonical route identity preserved: `frontend/src/shell/rbac.ts:22`
    - Backend remains authorization authority: `internal/app/inventory/service.go:614`, `internal/app/inventory/service_test.go:523`

### Security Notes

- Write operations are backend-gated by role (`requireMasterWriteAccess`) and not dependent on frontend visibility: `internal/app/inventory/service.go:614`, `internal/app/inventory/service.go:637`.
- Read access for operator role is intentional and explicit: `internal/app/inventory/service.go:674`.
- DB writes use parameterized SQL and schema checks for domain validity: `internal/infrastructure/db/sqlite_inventory_repository.go:756`, `internal/infrastructure/db/migrations/000009_parties.up.sql:3`.

### Best-Practices and References

- Go transaction handling guidance (use `BeginTx`, rollback on error, commit on success): https://pkg.go.dev/database/sql#DB.BeginTx
- SQLite constraint/index references for domain validity and conflict behavior: https://www.sqlite.org/lang_createtable.html and https://www.sqlite.org/lang_createindex.html
- React controlled form/input guidance for predictable validation UX: https://react.dev/reference/react-dom/components/input
- TanStack Query React guidance (stateful server-data patterns for list/query UIs): https://tanstack.com/query/latest/docs/framework/react/overview

### Action Items

**Code Changes Required:**

- [x] [High] Add missing party API contract tests for update-success, list-success, and explicit operator write-denial mapping (AC #5). [file: `cmd/server/api_server_test.go`]
- [x] [Med] Add explicit party read-only UI test asserting operator mode hides create/edit controls while list remains accessible (AC #5). [file: `frontend/src/components/forms/__tests__/PartyMasterForm.test.tsx`]

**Advisory Notes:**

- Note: Execute `scripts/s2-4-win-test.ps1 -Mode user-auto` on a Windows host and record PASS evidence in this story. [file: `docs/stories/2-4-supplier-customer-masters.md:184`]
