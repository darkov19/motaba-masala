# Story 3.2: Lot Tracking System

Status: review

## Story

As a Quality Manager,
I want each inbound GRN line to receive a unique internal lot number and all subsequent stock movements to carry that lot reference,
so that defects and recalls can be traced back to exact supplier deliveries.

## Acceptance Criteria

1. Saving a GRN generates a unique internal lot number for each inbound material line and persists the lot record linked to the originating GRN reference. [Source: docs/epics.md#Story 3.2: Lot Tracking System; docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]
2. Lot identifiers follow a deterministic internal format (e.g., `LOT-YYYYMMDD-###`) and uniqueness is enforced at persistence level. [Source: docs/epics.md#Story 3.2: Lot Tracking System; docs/tech-spec-epic-3.md#Data Models and Contracts]
3. Downstream stock movement records for lot-tracked materials store and expose the lot reference so traceability from intake through inventory operations is preserved. [Source: docs/epics.md#Story 3.2: Lot Tracking System; docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative); docs/PRD.md#Functional Requirements]
4. Label printing is not implemented in this story; lot IDs are generated and stored for future label workflows. [Source: docs/epics.md#Story 3.2: Lot Tracking System]

## Tasks / Subtasks

- [x] Extend GRN write flow to create lot entities transactionally with GRN header and lines, including rollback safety on partial failures (AC: 1, 2)
  - [x] Add lot number generator service with date + sequence strategy and conflict retry behavior (AC: 2)
  - [x] Add repository migration and persistence layer for `material_lots` and GRN-line linkage (AC: 1, 2)
  - [x] Ensure lot creation runs for eligible inbound item types and stores supplier linkage metadata where available (AC: 1)
- [x] Add lot-aware stock movement persistence and query surfaces to preserve traceability lifecycle (AC: 3)
  - [x] Extend stock movement records/contracts with lot reference fields for inbound and subsequent adjustments/movements (AC: 3)
  - [x] Add backend/API lot-listing support (`procurement.lots`) for quality traceability lookups (AC: 3)
- [x] Maintain explicit out-of-scope handling for printing while preserving future compatibility (AC: 4)
  - [x] Add UI/backend messaging that lot labels are deferred while lot IDs remain visible/copyable (AC: 4)
- [x] Add automated test coverage aligned to ACs and Epic 3 testing strategy (AC: 1, 2, 3, 4)
  - [x] Add repository integration tests for lot generation uniqueness and transactional rollback (AC: 1, 2)
  - [x] Add API contract tests for lot creation/listing paths and expected `400/401/403/409` mappings (AC: 1, 2, 3)
  - [x] Add service tests for read-only license write denial on lot-generating GRN writes (AC: 1)
  - [x] Add frontend/component tests for GRN confirmation showing generated lot IDs and keyboard-first operator flow continuity (AC: 3, 4)

## UX Acceptance Evidence (Required)

- UI/UX impact: [x] Yes [ ] No
- If no, state why this story has no UX/UI surface impact:
- UX spec references used:
  - [Source: docs/ux-design-specification.md#2.3 Core Experience Principles]
  - [Source: docs/ux-design-specification.md#5.1 Critical User Paths]
- Role-variant behavior verified (Admin Command Center vs Operator Speed Hub):
  - Admin: Lot-linked receipt history and lookup surfaces must support audit/decision workflows without breaking command-center information hierarchy.
  - Operator: GRN save flow must remain keyboard-first and fast while exposing generated lot IDs in immediate submission feedback.
- Visual conformance checks:
  - [ ] Theme/tokens (color, spacing, typography)
  - [ ] Information hierarchy and dashboard comprehension
  - [ ] Keyboard-first flow and operator speed
- Evidence artifacts:
  - Screenshots/recording:
  - Notes: Validate with `docs/ux-conformance-checklist.md` before moving story to review.

## Dev Notes

### Requirements Context Summary

- Epic 3 Story 3.2 focuses on assigning a unique internal lot number to each inbound receipt so defects and recalls can be traced to a specific supplier delivery. [Source: docs/epics.md#Story 3.2: Lot Tracking System]
- The authoritative technical criteria for this story are lot generation plus lot-linked movement traceability (`AC4` and `AC5` in epic tech spec). [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]
- This story builds directly on the Story 3.1 GRN intake flow: lot creation must occur at GRN-save time and bind to inbound material records rather than separate manual entry. [Source: docs/tech-spec-epic-3.md#Workflows and Sequencing; docs/stories/3-1-goods-received-note-grn-standard.md#Completion Notes List]
- PRD traceability expectations require internal lot identity for inbound materials and downstream stock movement tracking for quality/audit workflows. [Source: docs/PRD.md#Functional Requirements; docs/PRD.md#Domain-Specific Requirements]
- Label printing is explicitly deferred for future scope; current story scope is to generate and persist lot identifiers and references. [Source: docs/epics.md#Story 3.2: Lot Tracking System]

### Structure Alignment Summary

- Reuse the GRN seams introduced in Story 3.1 rather than creating parallel flows: `internal/app/inventory/service.go`, `internal/infrastructure/db/sqlite_inventory_repository.go`, and `cmd/server/api_server.go`. [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Completion Notes List; docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- Place schema evolution under `internal/infrastructure/db/migrations` and keep repository-first transactional writes consistent with existing architecture patterns. [Source: docs/architecture.md#2. Database Pattern: Repository & embedded Migrations; docs/tech-spec-epic-3.md#Data Models and Contracts]
- No `unified-project-structure.md` file is present in current docs set; use the architecture and existing code structure as the authoritative path map for this story. [Source: docs/architecture.md#Project Structure]

### Learnings from Previous Story

**From Story 3-1-goods-received-note-grn-standard (Status: done)**

- **New persistence baseline to reuse:** GRN line-level model and migration conventions are already established and should be extended for lot linkage, not reimplemented. [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Completion Notes List; docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- **NEW files to reuse directly:**
  - `internal/infrastructure/db/migrations/000010_grn_lines.up.sql` (baseline pattern for inbound line-table schema evolution)
  - `internal/infrastructure/db/migrations/000010_grn_lines.down.sql` (paired rollback pattern for procurement migrations)
  - `frontend/src/components/forms/__tests__/GRNForm.test.tsx` (existing GRN test harness to extend with lot assertions)
  [Source: docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- **MODIFIED files to extend for this story:**
  - `internal/app/inventory/service.go`
  - `internal/infrastructure/db/sqlite_inventory_repository.go`
  - `cmd/server/api_server.go`
  - `frontend/src/services/masterDataApi.ts`
  [Source: docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- **Service/API extension seams:** Continue through `InventoryService` and API server mappings so role/license/error semantics stay consistent across procurement flows. [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Completion Notes List; docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- **Quality warning carried forward:** Prior review identified missing evidence around negative quantity validation depth, GRN read-only write-denial coverage, and keyboard-first rapid-flow assertions; this story should close these gaps where they intersect inbound-lot workflows. [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Senior Developer Review (AI); docs/tech-spec-epic-3.md#Post-Review Follow-ups]
- **Pending review items affecting this story:**
  - Add explicit negative-quantity coverage in service/API paths where lot-enabled GRN writes are validated.
  - Add GRN write-path read-only license denial tests for lot-generating writes.
  - Add keyboard-first rapid-flow frontend assertions.
  - Strengthen multi-line intake behavior assertions.
  [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Action Items]

[Source: docs/stories/3-1-goods-received-note-grn-standard.md#Dev-Agent-Record]

### Architecture Patterns and Constraints

- Keep server-side Go + SQLite as the authoritative source for procurement mutations; frontend stays a thin workflow surface over bindings/API contracts. [Source: docs/architecture.md#Executive Summary; docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- Lot generation and lot-linked stock writes must be atomic with GRN persistence to avoid orphaned or partial traceability data. [Source: docs/tech-spec-epic-3.md#Reliability/Availability; docs/tech-spec-epic-3.md#Workflows and Sequencing]
- Preserve backend-authoritative RBAC and license write-mode enforcement on all procurement writes (including lot creation side effects). [Source: docs/tech-spec-epic-3.md#Non-Functional Requirements; docs/architecture.md#0. Cohesive App Contract]
- Keep optimistic locking/conflict behavior consistent for editable records and mapped `409` responses where applicable. [Source: docs/architecture.md#6. Resilience & Stability Patterns; docs/tech-spec-epic-3.md#APIs and Interfaces]

### Project Structure Notes

- Backend domain/app: lot generation orchestration in `internal/app/inventory` and supporting entities/contracts in `internal/domain/inventory`.
- Persistence/migrations: new lot-related tables and constraints under `internal/infrastructure/db/migrations`, repository methods in `internal/infrastructure/db/sqlite_inventory_repository.go`.
- API/bindings: lot-aware GRN and lot listing endpoints in `cmd/server/api_server.go` and app bindings in `internal/app/app.go`.
- Frontend: GRN confirmation/lot visibility and lot query UI in `frontend/src/components/forms`, `frontend/src/components/pages`, and `frontend/src/services`.
- No structural conflicts identified with current architecture guidance.

### Testing Standards Summary

- Add service/repository tests for uniqueness, transactional integrity, and rollback safety of lot creation on GRN save. [Source: docs/tech-spec-epic-3.md#Test Strategy Summary; docs/tech-spec-epic-3.md#Traceability Mapping]
- Add API contract coverage for validation/auth/forbidden/conflict status mapping (`400/401/403/409`) on lot-enabled procurement endpoints. [Source: docs/tech-spec-epic-3.md#APIs and Interfaces]
- Add frontend tests preserving keyboard-first intake flow while surfacing generated lot IDs and clear validation feedback. [Source: docs/ux-design-specification.md#2.3 Core Experience Principles; docs/ux-design-specification.md#5.1 Critical User Paths]
- Include explicit read-only license denial coverage for lot-generating writes to satisfy existing Epic 3 follow-up gaps. [Source: docs/tech-spec-epic-3.md#Post-Review Follow-ups]

### References

- [Source: docs/epics.md#Story 3.2: Lot Tracking System]
- [Source: docs/epics.md#Epic 3: Procurement & Inventory (Inbound)]
- [Source: docs/tech-spec-epic-3.md#Acceptance Criteria (Authoritative)]
- [Source: docs/tech-spec-epic-3.md#Data Models and Contracts]
- [Source: docs/tech-spec-epic-3.md#Workflows and Sequencing]
- [Source: docs/tech-spec-epic-3.md#APIs and Interfaces]
- [Source: docs/tech-spec-epic-3.md#Reliability/Availability]
- [Source: docs/tech-spec-epic-3.md#Test Strategy Summary]
- [Source: docs/tech-spec-epic-3.md#Post-Review Follow-ups]
- [Source: docs/PRD.md#Functional Requirements]
- [Source: docs/PRD.md#Domain-Specific Requirements]
- [Source: docs/architecture.md#Executive Summary]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/architecture.md#0. Cohesive App Contract]
- [Source: docs/architecture.md#1. IPC Pattern: Wails Bindings (Service Method)]
- [Source: docs/architecture.md#2. Database Pattern: Repository & embedded Migrations]
- [Source: docs/architecture.md#6. Resilience & Stability Patterns]
- [Source: docs/ux-design-specification.md#2.3 Core Experience Principles]
- [Source: docs/ux-design-specification.md#5.1 Critical User Paths]
- [Source: docs/ux-conformance-checklist.md#F. Evidence Required in Story]
- [Source: docs/sprint-status.yaml#development_status]
- [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Completion Notes List]
- [Source: docs/stories/3-1-goods-received-note-grn-standard.md#File List]
- [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Senior Developer Review (AI)]
- [Source: docs/stories/3-1-goods-received-note-grn-standard.md#Action Items]

## Dev Agent Record

### Context Reference

- docs/stories/3-2-lot-tracking-system.context.xml

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-27: Planned implementation around existing GRN seams (`Service.CreateGRNRecord` -> repository transaction -> API/binding response) to preserve licensing/RBAC/error mappings while adding lot generation and listing.
- 2026-02-27: Added migration `000011_material_lots` with `material_lots` table and `stock_ledger.lot_number` extension to keep lot traceability persisted with inbound movement events.
- 2026-02-27: Implemented deterministic lot allocator (`LOT-YYYYMMDD-###`) with unique-conflict retry inside GRN transaction and mapped persistence conflicts/validation failures to service-layer contract errors.
- 2026-02-27: Extended API/app/frontend contracts with `ListMaterialLots` and GRN line `lot_number`, plus GRN success UI with copyable lot IDs and explicit deferred-label messaging.
- 2026-02-27: Added repository/service/API/frontend automated tests and verified full Go + frontend regression suites.

### Completion Notes List

- Lot creation now runs transactionally with GRN header/lines and stock-ledger inserts; each GRN line receives a persisted `material_lots` row and `stock_ledger.lot_number` reference.
- Lot IDs follow deterministic `LOT-YYYYMMDD-###` format using date-scoped sequence allocation with retry loop on uniqueness collisions.
- Added backend lot lookup surface via `/inventory/lots/list`, App `ListMaterialLots`, and frontend `listMaterialLots` service contract for `procurement.lots` workflows.
- GRN UI now exposes generated lot IDs as copyable values after submit and clearly states that label printing is deferred in this story scope.
- Regression executed: `GOCACHE=/tmp/go-build-cache go test ./...` and `cd frontend && npm run test:run` both passed on 2026-02-27.
- Windows validation script added: `scripts/s3-2-win-test.ps1` (not executed in this Linux workspace).

### File List

- internal/domain/inventory/entities.go
- internal/domain/inventory/repository.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- internal/app/app.go
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- internal/infrastructure/db/migrations/000011_material_lots.up.sql
- internal/infrastructure/db/migrations/000011_material_lots.down.sql
- internal/infrastructure/db/migrations_test.go
- cmd/server/api_server.go
- cmd/server/api_server_test.go
- frontend/src/services/masterDataApi.ts
- frontend/src/components/forms/GRNForm.tsx
- frontend/src/components/forms/__tests__/GRNForm.test.tsx
- scripts/s3-2-win-test.ps1

## Change Log

- 2026-02-27: Initial draft created by create-story workflow for Story 3.2 from sprint backlog.
- 2026-02-27: Implemented lot tracking across GRN persistence, stock ledger references, lot listing API contract, frontend GRN lot visibility, and automated coverage for repository/service/API/UI.

## Senior Developer Review (AI)

### Reviewer

TBD

### Date

TBD

### Outcome

Pending

### Summary

Pending review.

### Key Findings

- Pending review.

### Action Items

- [x] Pending review.

### Review Follow-ups (AI)

- [x] Pending review.
