# Story 3.1: Goods Received Note (GRN) - Standard

Status: ready-for-dev

## Story

As a Store Keeper,
I want to record receipt of raw materials and packing materials through GRN with supplier and invoice references,
so that stock is increased correctly and procurement cost tracking remains auditable.

## Acceptance Criteria

1. The system allows recording a GRN for inbound `RAW` and `PACKING_MATERIAL` items and increases stock based on received quantities. [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative); docs/epics.md#Story 3.1: Goods Received Note (GRN) - Standard]
2. Each GRN enforces quantity validation where every line quantity must be greater than zero before save. [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative); docs/epics.md#Story 3.1: Goods Received Note (GRN) - Standard]
3. The system captures supplier reference and invoice number on GRN records for procurement traceability. [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative); docs/PRD.md#Functional Requirements]
4. Packing profile components are procured as separate line items with independent stock balances at intake time (grouping deferred to packing execution). [Source: docs/epics.md#Story 3.1: Goods Received Note (GRN) - Standard; docs/tech-spec-epic-3.md#Data Models and Contracts]

## Tasks / Subtasks

- [ ] Implement GRN create flow for raw and packing-material line items with transactional stock-in updates (AC: 1)
- [ ] Extend procurement persistence for line-level inbound details (`grn_lines`) and inventory movement recording (AC: 1)
- [ ] Wire API and frontend request/response contracts for GRN line submission and success/error feedback (AC: 1)
- [ ] Validate AC1 with automated coverage (AC: 1)
  - [ ] Add backend service/API tests for GRN create success and stock increase assertions for `RAW` and `PACKING_MATERIAL` lines
- [ ] Enforce strict quantity validation (`> 0`) at UI, API, and service layers with explicit validation errors (AC: 2)
- [ ] Validate AC2 with automated coverage (AC: 2)
  - [ ] Add negative/zero quantity tests across UI validation and API/service `400` rejection paths
- [ ] Add supplier and invoice capture to GRN submission/edit surfaces and persistence mapping (AC: 3)
- [ ] Validate AC3 with automated coverage (AC: 3)
  - [ ] Add API/repository tests confirming supplier reference and invoice number persistence on GRN records
- [ ] Ensure packing material components remain independently stocked and represented as discrete GRN lines (AC: 4)
- [ ] Validate AC4 with automated coverage (AC: 4)
  - [ ] Add frontend/integration tests confirming packing profile components are entered/stored as separate line items with independent balances
- [ ] Add cross-cutting auth/license and transactional safety tests (AC: 1, 2, 3)
  - [ ] Add role/license denial coverage for procurement writes (`401/403`) and rollback-safety integration tests for GRN header+line failures
- [ ] Add API contract and operator-flow test depth (AC: 1, 2, 3, 4)
  - [ ] Add API contract tests for `400/401/403/409` mappings and frontend keyboard-first rapid GRN flow assertions

## UX Acceptance Evidence (Required)

- UI/UX impact: [x] Yes [ ] No
- If no, state why this story has no UX/UI surface impact:
- UX spec references used:
  - [Source: docs/ux-design-specification.md#5.1 Critical User Paths]
  - [Source: docs/ux-design-specification.md#2.3 Core Experience Principles]
  - [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach]
- Role-variant behavior verified (Admin Command Center vs Operator Speed Hub):
  - Admin: GRN surfaces should preserve procurement visibility and KPI-linked drill-down expectations without changing route/module ownership.
  - Operator: GRN entry should remain keyboard-first, rapid, and validation-forward for repetitive intake transactions.
- Visual conformance checks:
  - [ ] Theme/tokens (color, spacing, typography)
  - [ ] Information hierarchy and dashboard comprehension
  - [ ] Keyboard-first flow and operator speed
- Evidence artifacts:
  - Screenshots/recording:
  - Notes: Validate against `docs/ux-conformance-checklist.md` before moving story to review.

## Dev Notes

### Requirements Context Summary

- Epic 3 introduces inbound procurement as authoritative inventory movement and explicitly includes Story 3.1 for GRN intake of raw and packing materials. [Source: docs/tech-spec-epic-3.md#Overview; docs/epics.md#Epic 3: Procurement & Inventory (Inbound)]
- Story 3.1 scope is GRN creation with stock increase behavior, supplier/invoice capture, and positive quantity validation. [Source: docs/epics.md#Story 3.1: Goods Received Note (GRN) - Standard; docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]
- PRD functional requirements that directly apply are `FR-001` (GRN) and supporting procurement constraints around traceable stock transactions. [Source: docs/PRD.md#Functional Requirements]
- Technical model direction requires line-level GRN data (`grn_lines`) and transactional write behavior aligned to existing repository/service patterns. [Source: docs/tech-spec-epic-3.md#Data Models and Contracts; docs/tech-spec-epic-3.md#Services and Modules]

### Structure Alignment Summary

- Reuse current inventory seams already established in prior stories: `internal/app/inventory/service.go`, `cmd/server/api_server.go`, and frontend data-service wiring patterns rather than introducing parallel procurement stacks. [Source: docs/stories/2-4-supplier-customer-masters.md#Completion Notes List; docs/stories/2-4-supplier-customer-masters.md#File List]
- Extend persistence and migration layers under `internal/infrastructure/db` for `grn_lines` and related transactional stock movement updates to keep schema evolution migration-first. [Source: docs/tech-spec-epic-3.md#Data Models and Contracts; docs/architecture.md#2. Database Pattern: Repository & embedded Migrations]
- Maintain backend-authoritative RBAC and route ownership while implementing procurement workflows in shared shell patterns. [Source: docs/architecture.md#0. Cohesive App Contract]

### Learnings from Previous Story

**From Story 2-4-supplier-customer-masters (Status: done)**

- **Reusable seams already in place:** Continue extending `internal/app/inventory/service.go`, `cmd/server/api_server.go`, and frontend service-layer integrations instead of creating new orchestration paths.
- **Persistence pattern to keep:** Use rollback-safe transaction handling in SQLite repository implementations for multi-row write operations.
- **Quality baseline:** Keep explicit API success + error contract coverage and role-denial assertions as a default standard for new procurement endpoints.
- **Review carry-forward:** No unchecked review action items were found in Story 2.4, but Windows runtime evidence tracking remains an execution discipline to preserve.
- **NEW files from previous story to reuse patterns from:**
  - `internal/infrastructure/db/migrations/000009_parties.up.sql` (NEW migration baseline pattern for schema additions)
  - `internal/infrastructure/db/migrations/000009_parties.down.sql` (NEW rollback counterpart pattern)
  - `scripts/s2-4-win-test.ps1` (NEW story-scoped Windows validation script pattern)
- **MODIFIED files from previous story to extend:**
  - `internal/app/inventory/service.go` (service-layer authorization and orchestration seams)
  - `cmd/server/api_server.go` (HTTP route and status-mapping seams)
  - `frontend/src/services/masterDataApi.ts` (frontend API contract wiring seam)

[Source: docs/sprint-status.yaml#development_status]
[Source: docs/stories/2-4-supplier-customer-masters.md#Completion Notes List]
[Source: docs/stories/2-4-supplier-customer-masters.md#File List]
[Source: docs/stories/2-4-supplier-customer-masters.md#Action Items]
[Source: stories/2-4-supplier-customer-masters.md#Completion Notes List]
[Source: stories/2-4-supplier-customer-masters.md#File List]

### Architecture Patterns and Constraints

- Keep distributed Wails contract: server-side Go + SQLite remain authoritative for inventory mutation; client remains binding/proxy UI. [Source: docs/architecture.md#Executive Summary; docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- Use atomic transaction boundaries for GRN header + line inserts so partial commits do not corrupt stock state. [Source: docs/tech-spec-epic-3.md#Reliability/Availability]
- Preserve optimistic locking and explicit conflict semantics on editable records where applicable. [Source: docs/architecture.md#6. Resilience & Stability Patterns; docs/tech-spec-epic-3.md#APIs and Interfaces]
- Enforce role and license restrictions for procurement writes (read-only/grace must deny mutation). [Source: docs/tech-spec-epic-3.md#Non-Functional Requirements; docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]

### Project Structure Notes

- Backend: implement GRN line-aware service/repository changes in `internal/app/inventory` and `internal/infrastructure/db` with migration files under `internal/infrastructure/db/migrations`.
- API/bindings: extend procurement endpoints and handler mappings in `cmd/server/api_server.go` and app bindings where required.
- Frontend: keep GRN entry UI and service calls in existing procurement/master-data interaction layers under `frontend/src/components/forms` and `frontend/src/services`.
- No project-structure conflicts detected against current architecture guidance.

### Testing Standards Summary

- Add unit + integration coverage for quantity validation, supplier/invoice field handling, and transactional rollback on partial failure. [Source: docs/tech-spec-epic-3.md#Traceability Mapping; docs/tech-spec-epic-3.md#Reliability/Availability]
- Add API contract tests for expected status mappings (`400/401/403/409`) and authorization/license enforcement. [Source: docs/tech-spec-epic-3.md#APIs and Interfaces]
- Add frontend tests validating keyboard-first GRN flow, clear validation feedback, and packing-component line entry behavior. [Source: docs/ux-design-specification.md#5.1 Critical User Paths; docs/ux-design-specification.md#2.3 Core Experience Principles]

### References

- [Source: docs/epics.md#Story 3.1: Goods Received Note (GRN) - Standard]
- [Source: docs/epics.md#Epic 3: Procurement & Inventory (Inbound)]
- [Source: docs/tech-spec-epic-3.md#Overview]
- [Source: docs/tech-spec-epic-3.md#Services and Modules]
- [Source: docs/tech-spec-epic-3.md#Data Models and Contracts]
- [Source: docs/tech-spec-epic-3.md#APIs and Interfaces]
- [Source: docs/tech-spec-epic-3.md#Reliability/Availability]
- [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]
- [Source: docs/tech-spec-epic-3.md#Traceability Mapping]
- [Source: docs/PRD.md#Functional Requirements]
- [Source: docs/architecture.md#Executive Summary]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/architecture.md#0. Cohesive App Contract]
- [Source: docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- [Source: docs/architecture.md#2. Database Pattern: Repository & embedded Migrations]
- [Source: docs/architecture.md#6. Resilience & Stability Patterns]
- [Source: docs/ux-design-specification.md#2.3 Core Experience Principles]
- [Source: docs/ux-design-specification.md#4.1 Chosen Design Approach]
- [Source: docs/ux-design-specification.md#5.1 Critical User Paths]
- [Source: docs/ux-conformance-checklist.md#F. Evidence Required in Story]
- [Source: docs/sprint-status.yaml#development_status]
- [Source: docs/stories/2-4-supplier-customer-masters.md#Completion Notes List]
- [Source: docs/stories/2-4-supplier-customer-masters.md#File List]
- [Source: docs/stories/2-4-supplier-customer-masters.md#Action Items]

## Dev Agent Record

### Context Reference

- docs/stories/3-1-goods-received-note-grn-standard.context.xml

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-27: Story drafted from Epic 3 backlog using `docs/sprint-status.yaml` first backlog selection and source-driven AC/task derivation.
- 2026-02-27: Continuity review performed against Story 2.4 to carry forward implementation/test quality patterns.

### Completion Notes List

- Drafted Story 3.1 with authoritative AC mapping from Epic 3 tech spec and epics definitions.
- Added implementation tasks aligned to AC coverage, including backend/API/frontend and testing expectations.
- Added UX acceptance evidence planning with role-variant expectations and checklist reference.
- Included previous-story learnings to preserve service/repository/API extension seams and quality standards.

### File List

- docs/stories/3-1-goods-received-note-grn-standard.md (created)

## Change Log

- 2026-02-27: Initial draft created by create-story workflow for Story 3.1 from sprint backlog.
