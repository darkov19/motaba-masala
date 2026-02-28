# Story 3.3: Third-Party Bulk Procurement

**Status:** ready-for-dev  
**Epic:** 3 - Procurement & Inventory

## User Story

**As a** Factory Manager  
**I want to** record the purchase of "Bulk Powder" directly from third-party suppliers  
**So that** we can fulfill orders when in-house production is down, while keeping the stock categorized correctly and its source traceable.

## Acceptance Criteria

1. **Third-Party Purchase Entry:**
    - [ ] Similar to a Raw Material GRN, the user can create a Goods Received Note but select items categorized as `BULK_POWDER`.
    - [ ] The system must enforce selecting a "Supplier".
2. **Source Flagging & Traceability:**
    - [ ] When Third-Party Bulk is received, it is added to the general `Bulk Powder` inventory, but the specific lot MUST be flagged with the source `external` (Data model: `source_type = SUPPLIER_GRN`, `supplier_id` populated).
    - [ ] The stock ledger MUST display the Supplier Name for these specific externally sourced lots.
3. **Valuation Impact:**
    - [ ] Unlike in-house bulk where the value is derived from Raw Materials + Process Loss, the value of Third-Party Bulk is strictly the Purchase Price on the GRN (`unit_cost` on `material_lots` is directly the GRN `unit_price`).
4. **Available for Packing:**
    - [ ] These external lots must immediately appear in the "Source Batch" dropdown when users are executing a Packing Run (Epic 5).

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

- [ ]   1. Update the GRN creation service (`/inventory/grns/create`) to fetch `ItemType` for lines and handle `BULK_POWDER` correctly.
- [ ]   2. Ensure `material_lots` generation correctly populates `supplier_id` and sets `unit_cost` from the GRN line price for third-party bulk items.
- [ ]   3. Write/update unit & integration tests simulating a GRN payload containing `BULK_POWDER` items to verify traceability links.

### Frontend Tasks

- [ ]   4. Validate that the `/procurement/grn` form allows the selection of `BULK_POWDER` items from the Item Master (remove any filters restricting exclusively to Raw Materials if they exist).
- [ ]   5. Ensure the Supplier dropdown is strictly validated (required) when submitting the GRN.
- [ ]   6. Update the Stock Ledger view to expose the Supplier Name alongside `BULK_POWDER` lots when `source_type == SUPPLIER_GRN`.

## UX/Validation Evidence

_(To be filled during execution)_

## Dev Notes

- Ensure that the single canonical Item Master is queried correctly across views. When querying items for GRN, standard process should allow raw materials, packing materials, and bulk powders (since all can be purchased contextually).
- Take care with the `tech-spec-epic-3.md` models. The `material_lots` table utilizes fields like `source_type`, `supplier_id`, and `unit_cost`. Keep testing strict around the `Source: External` flags.

## Traceability

- **Upstream Requirement:** PRD: FR-010 (Direct Purchase), FR-011 (Repacking)
- **Design Pattern:** Architecture: IPC Pattern (Wails Bindings), Navigation: `procurement.grn` route.

## Dev Agent Record

### Context Reference

- docs/stories/3-3-third-party-bulk-procurement.context.xml

## Agent Activity Record

- 2026-02-27: Story drafted by `[BMad Workflow: Create Story]` based on Epic 3 context, Architecture specifications, and UX specifications.
