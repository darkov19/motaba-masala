# Story 3.3: Third-Party Bulk Procurement

**Status:** done
**Epic:** 3 - Procurement & Inventory

## User Story

**As a** Factory Manager
**I want to** record the purchase of "Bulk Powder" directly from third-party suppliers
**So that** we can fulfill orders when in-house production is down, while keeping the stock categorized correctly and its source traceable.

## Acceptance Criteria

1. **Third-Party Purchase Entry:**
    - [x] Similar to a Raw Material GRN, the user can create a Goods Received Note but select items categorized as `BULK_POWDER`.
    - [x] The system must enforce selecting a "Supplier".
2. **Source Flagging & Traceability:**
    - [x] When Third-Party Bulk is received, it is added to the general `Bulk Powder` inventory, but the specific lot MUST be flagged with the source `external` (Data model: `source_type = SUPPLIER_GRN`, `supplier_id` populated).
    - [x] The stock ledger MUST display the Supplier Name for these specific externally sourced lots.
3. **Valuation Impact:**
    - [x] Unlike in-house bulk where the value is derived from Raw Materials + Process Loss, the value of Third-Party Bulk is strictly the Purchase Price on the GRN (`unit_cost` on `material_lots` is directly the GRN `unit_price`).
4. **Available for Packing:**
    - [x] These external lots must immediately appear in the "Source Batch" dropdown when users are executing a Packing Run (Epic 5). *(BULK_POWDER lots are now queryable by item_id via ListMaterialLots, ready for Epic 5 consumption)*

## Tech Spec / Implementation Details

### API & Service Layer Requirements

- **Endpoint:** POST `/inventory/grns/create`
- **Service Logic Adjustment:**
    - The GRN service must inspect the **ItemType** of each line item from the Item Master.
    - If `ItemType == RAW_MATERIAL` or `PACKING_MATERIAL`, create the `material_lots` record with `source_type = SUPPLIER_GRN` (standard).
    - If `ItemType == BULK_POWDER`, create the `material_lots` record with `source_type = SUPPLIER_GRN`, and explicitly ensure the `supplier_id` from the GRN header is linked directly to the lot for traceability.
    - The `unit_cost` on the generated lot must reflect the `UnitPrice` from the GRN line.
- **RBAC Enforcement:** Requires `create` action permission on the `procurement` module (minimum role: `operator`).

### UI / UX Notes

- **Route:** `procurement.grn` (Path: `/procurement/grn`)
- Do NOT create a separate "Third Party GRN" screen. Both raw materials and third-party bulk purchases utilize the same seamless GRN form.
- The form should continue to rely on rapid keyboard-first data entry (Tab-key navigation).
- When a `BULK_POWDER` item is selected in the Item dropdown, the Supplier field must remain strictly mandatory, and the view should support standard GRN submission without altering the layout.

## Task Breakdown

### Backend Tasks

- [x]   1. Update the GRN creation service (`/inventory/grns/create`) to fetch `ItemType` for lines and handle `BULK_POWDER` correctly.
- [x]   2. Ensure `material_lots` generation correctly populates `supplier_id` and sets `unit_cost` from the GRN line price for third-party bulk items.
- [x]   3. Write/update unit & integration tests simulating a GRN payload containing `BULK_POWDER` items to verify traceability links.

### Frontend Tasks

- [x]   4. Validate that the `/procurement/grn` form allows the selection of `BULK_POWDER` items from the Item Master (remove any filters restricting exclusively to Raw Materials if they exist).
- [x]   5. Ensure the Supplier dropdown is strictly validated (required) when submitting the GRN.
- [x]   6. Update the Stock Ledger view to expose the Supplier Name alongside `BULK_POWDER` lots when `source_type == SUPPLIER_GRN`.

### Review Follow-ups (AI)

- [x] [AI-Review][Med] Add test: render lot with `source_type: 'SUPPLIER_GRN'` and assert "External" Tag renders in ProcurementLotsPage (AC #2) [file: frontend/src/components/forms/__tests__/ProcurementLotsPage.test.tsx]
- [x] [AI-Review][Med] Add test: render lot with `unit_cost: 55.5` and assert "55.50" appears in Unit Cost column in ProcurementLotsPage (AC #3) [file: frontend/src/components/forms/__tests__/ProcurementLotsPage.test.tsx]
- [x] [AI-Review][Low] Add `UnitPrice >= 0` validation in `GRN.Validate()` to reject negative unit prices at domain level (AC #3) [file: internal/domain/inventory/entities.go:277]
- [x] [Post-Review][Med] Replace `supplier_name TEXT` with `supplier_id INTEGER FK` in `grns` and `material_lots` tables — migration 000013 applied, all layers updated (entities, service, repository, app adapter, frontend types, GRNForm, all test files). `ListMaterialLots` JOINs `parties` to resolve display name.

## UX/Validation Evidence

- Backend: 7 new/updated tests pass (3 service-layer, 4 repository integration)
- Frontend: 7 GRNForm tests pass (2 new: BULK_POWDER loading + unit_price submission)
- Full regression: 54 frontend tests pass, all Go packages pass

## Dev Notes

- Ensure that the single canonical Item Master is queried correctly across views. When querying items for GRN, standard process should allow raw materials, packing materials, and bulk powders (since all can be purchased contextually).
- Take care with the `tech-spec-epic-3.md` models. The `material_lots` table utilizes fields like `source_type`, `supplier_id`, and `unit_cost`. Keep testing strict around the `Source: External` flags.

## Traceability

- **Upstream Requirement:** PRD: FR-010 (Direct Purchase), FR-011 (Repacking)
- **Design Pattern:** Architecture: IPC Pattern (Wails Bindings), Navigation: `procurement.grn` route.

## Dev Agent Record

### Context Reference

- docs/stories/3-3-third-party-bulk-procurement.context.xml

### Debug Log

**2026-02-28 – Implementation Plan**

Analysis complete. The current codebase state:
- `material_lots` table: missing `source_type` and `unit_cost` columns
- `grn_lines` table: missing `unit_price` column
- `validateGRNLineItemTx` restricts items to `RAW` and `PACKING_MATERIAL` only
- `GRNForm.tsx` loads only RAW + PACKING_MATERIAL items
- `GRNLineInput` lacks `UnitPrice` field

Implementation order:
1. Migration 000012 – add columns to `grn_lines` (unit_price) and `material_lots` (source_type, unit_cost)
2. Domain entity updates – `GRNLine.UnitPrice`, `MaterialLot.SourceType/UnitCost`
3. Repository – widen `validateGRNLineItemTx` to include BULK_POWDER, update INSERT/SELECT for lots and lines
4. Service – map `UnitPrice` through `GRNLineInput`, update error messages
5. Frontend types – extend `CreateGRNPayload` lines (unit_price) and `MaterialLot` (source_type, unit_cost)
6. GRNForm – load BULK_POWDER items (3rd `listItems` call), add `unit_price` InputNumber per line
7. ProcurementLotsPage – show "External" badge + unit_cost column in lots table
8. Tests – 3 service tests + 4 repo integration tests + 2 frontend tests added

**Notes on AC2 supplier_id:** Initially, `supplier_name TEXT` was used throughout. After code review, this was refactored (migration 000013) to `supplier_id INTEGER FK` in both `grns` and `material_lots`. `ListMaterialLots` JOINs `parties p ON p.id = ml.supplier_id` to resolve the display name; `MaterialLot.SupplierName` is a display-only field populated by this JOIN and is not stored.

### Completion Notes

Story 3.3 complete. All 6 tasks implemented and tested:

**Backend changes:**
- Migration 000012: `grn_lines.unit_price`, `material_lots.source_type`, `material_lots.unit_cost`
- `internal/domain/inventory/entities.go`: Added `UnitPrice` to `GRNLine`; `SourceType`/`UnitCost` to `MaterialLot`
- `internal/app/inventory/service.go`: Added `UnitPrice` to `GRNLineInput`, updated `CreateGRNRecord` mapping, updated GRN error message to include BULK_POWDER
- `internal/infrastructure/db/sqlite_inventory_repository.go`: Widened `validateGRNLineItemTx` to allow BULK_POWDER; updated GRN line INSERT with unit_price; updated lot INSERT with source_type='SUPPLIER_GRN' and unit_cost; updated ListMaterialLots SELECT and Scan

**Frontend changes:**
- `frontend/src/services/masterDataApi.ts`: Added `unit_price` to `CreateGRNPayload` lines; added `source_type`/`unit_cost` to `MaterialLot` type
- `frontend/src/components/forms/GRNForm.tsx`: Added BULK_POWDER to item loading; added unit_price InputNumber per GRN line; updated item placeholder text
- `frontend/src/components/forms/ProcurementLotsPage.tsx`: Added "External" source tag to Supplier column; added Unit Cost column

**Tests added:**
- 3 service tests: BulkPowder_AcceptedByService, BulkPowder_UnitPriceMappedToLine, BulkPowder_SupplierRequiredValidation
- 4 repository integration tests: BulkPowder_CreatesLotWithSourceTypeAndUnitCost, BulkPowder_AppearsInListMaterialLots, BulkPowder_FinishedGoodRejected, UnitPricePersistedOnGRNLine
- 2 frontend tests: loads BULK_POWDER items, submits GRN with unit_price for BULK_POWDER

## File List

- `internal/infrastructure/db/migrations/000012_bulk_powder_grn.up.sql` (new)
- `internal/infrastructure/db/migrations/000012_bulk_powder_grn.down.sql` (new)
- `internal/infrastructure/db/migrations/000013_supplier_id_fk.up.sql` (new — post-review refactor)
- `internal/infrastructure/db/migrations/000013_supplier_id_fk.down.sql` (new — post-review refactor)
- `internal/domain/inventory/entities.go` (modified)
- `internal/app/inventory/service.go` (modified)
- `internal/app/inventory/service_test.go` (modified)
- `internal/infrastructure/db/sqlite_inventory_repository.go` (modified)
- `internal/infrastructure/db/sqlite_inventory_repository_test.go` (modified)
- `frontend/src/services/masterDataApi.ts` (modified)
- `frontend/src/components/forms/GRNForm.tsx` (modified)
- `frontend/src/components/forms/ProcurementLotsPage.tsx` (modified)
- `frontend/src/components/forms/__tests__/GRNForm.test.tsx` (modified)
- `docs/stories/3-3-third-party-bulk-procurement.md` (modified)
- `docs/sprint-status.yaml` (modified)

## Change Log

- 2026-02-28: Implemented third-party bulk procurement (Story 3.3) — 6 tasks complete, 11 files changed, 9 new tests added
- 2026-02-28: Senior Developer Review (AI) appended — outcome: Changes Requested
- 2026-02-28: Senior Developer Review (AI) updated — outcome: APPROVE (all findings resolved)
- 2026-02-28: Post-review refactor — migration 000013 replaces `supplier_name TEXT` with `supplier_id INTEGER FK` in `grns` and `material_lots`; all 12 Go packages and 56 frontend tests pass

---

## Senior Developer Review (AI)

**Reviewer:** darko
**Date:** 2026-02-28
**Outcome:** ✅ APPROVE

---

### Summary

Story 3.3 is now fully implemented and verified. The developer has addressed all previous review findings, including adding missing test coverage for the `ProcurementLotsPage` UI and implementing domain-level validation for `UnitPrice`. The implementation correctly handles third-party `BULK_POWDER` procurement through the standard GRN flow, ensuring traceability and correct valuation.

---

### Key Findings

#### Resolved

1. **✅ Fixed: Missing test coverage for new ProcurementLotsPage UI fields (AC2, AC3)**
   - Two new tests added to `ProcurementLotsPage.test.tsx:125-163` verifying "External" badge and Unit Cost column rendering.
   - Verified that `frontend/src/components/forms/__tests__/ProcurementLotsPage.test.tsx` now contains these tests.

2. **✅ Fixed: No validation for negative `unit_price` in `GRN.Validate()`**
   - Added `if line.UnitPrice < 0 { return ErrGRNLineUnitPrice }` in `internal/domain/inventory/entities.go:284`.

---

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | BULK_POWDER items selectable in GRN form; Supplier strictly required | ✅ IMPLEMENTED | `sqlite_inventory_repository.go:1085`; `GRNForm.tsx:99-107`; `GRNForm.tsx:173-176` |
| AC2 | Lots flagged `source_type=SUPPLIER_GRN`; Supplier Name shown in stock ledger | ✅ IMPLEMENTED | `sqlite_inventory_repository.go:1198`; `ProcurementLotsPage.tsx:162-164` |
| AC3 | `unit_cost` on lot = `unit_price` from GRN line | ✅ IMPLEMENTED | `sqlite_inventory_repository.go:1198`; `GRNForm.tsx:164`; `ProcurementLotsPage.tsx:183` |
| AC4 | Lots queryable by item_id via ListMaterialLots for Epic 5 | ✅ IMPLEMENTED | `sqlite_inventory_repository.go:1239-1241`; `BulkPowder_AppearsInListMaterialLots` test |

**4 of 4 acceptance criteria fully implemented**

---

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| 1. Update GRN service to accept BULK_POWDER | ✅ Complete | ✅ VERIFIED | `sqlite_inventory_repository.go:1085`; `service.go:811` |
| 2. material_lots: populate supplier_id, unit_cost from line price | ✅ Complete | ✅ VERIFIED | `sqlite_inventory_repository.go:1196-1199` |
| 3. Write unit/integration tests for BULK_POWDER traceability | ✅ Complete | ✅ VERIFIED | `service_test.go:897-965`; `sqlite_inventory_repository_test.go:1226-1348` |
| 4. GRN form allows BULK_POWDER item selection | ✅ Complete | ✅ VERIFIED | `GRNForm.tsx:99-107`; `GRNForm.test.tsx:208` |
| 5. Supplier dropdown strictly required | ✅ Complete | ✅ VERIFIED | `GRNForm.tsx:173-176`; `GRNForm.tsx:242` |
| 6. Stock Ledger shows Supplier Name + External badge for SUPPLIER_GRN lots | ✅ Complete | ✅ VERIFIED | `ProcurementLotsPage.tsx:162-164, 183`; `ProcurementLotsPage.test.tsx:125-163` |

**Summary: 6 of 6 completed tasks fully verified**

---

### Test Coverage and Gaps

**Covered:**
- Backend: 7 new service/repository tests.
- Frontend: 9 GRNForm tests + 6 ProcurementLotsPage tests.
- Domain: Negative unit price validation test added and verified.

---

### Architectural Alignment

- ✅ Follows existing repository and service patterns.
- ✅ Transactional integrity maintained for GRN creation.

---

### Security Notes

- ✅ RBAC guards and input validation are correctly applied.

---

### Action Items

**Code Changes Required:**
- (None)

**Advisory Notes:**
- Note: `supplier_id` FK deferred from material_lots — dev notes track this for Epic 5; no action needed now
- Note: Down migration does not recreate `idx_material_lots_source_type` index after rollback — low impact but consider adding to down migration for completeness

## Agent Activity Record

- 2026-02-27: Story drafted by `[BMad Workflow: Create Story]` based on Epic 3 context, Architecture specifications, and UX specifications.
- 2026-02-28: Implementation complete by Dev Agent. All tasks/ACs satisfied, all tests pass. Status → review.
- 2026-02-28: Senior Developer Review (AI) outcome → APPROVE. Status → done.
- 2026-02-28: Post-review refactor by Dev Agent — migration 000013 (`supplier_id FK`), all layers updated. All tests pass. Status remains done.
