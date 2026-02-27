# Epic Technical Specification: Procurement & Inventory (Inbound)

Date: 2026-02-27
Author: darko
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 implements inbound procurement operations so physical receipts of raw materials, packing materials, and externally sourced bulk become authoritative stock events instead of manual/off-system updates. It turns Epic 2 master data (items, parties, unit conversion rules, packaging profiles) into transactional inventory movement with auditable GRN, lot identity, and reconciliation support.

The core outcome is reliable stock increase and cost-capture at intake time, with traceability primitives required for downstream production, packing, and audit workflows. This epic specifically covers the PRD inbound goals (`FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-010`, `FR-011`) and the Epic 3 stories (`3.1`-`3.4`) in `docs/epics.md`.

## Objectives and Scope

- In-scope:
- Implement GRN transaction flow for inbound receipts across `RAW`, `PACKING_MATERIAL`, and third-party `BULK_POWDER` item types.
- Persist supplier-linked procurement records with invoice references and enforce positive quantity validation per story 3.1.
- Introduce lot-tracking persistence so each inbound receipt can be traced via generated internal lot identifiers per story 3.2.
- Support third-party bulk intake path that reuses GRN mechanics while preserving external-source traceability per story 3.3.
- Implement stock reconciliation transaction capture with mandatory reason codes and immutable audit trail linkage per story 3.4 and PRD `FR-004`.
- Surface stock-level signals needed for reorder awareness in procurement views, aligned to PRD reorder-alert requirement.

- Out-of-scope:
- Production batch execution, consumption, and yield accounting (Epic 4).
- Packing conversion and profile deduction execution (Epic 5).
- Sales/dispatch/invoice and returns flows (Epic 6).
- Reporting module implementation beyond ensuring inbound events are ledger-ready for Epic 7 consumers.

## System Architecture Alignment

This epic aligns with the existing distributed Wails architecture where server-side Go services and SQLite remain authoritative, and both `Server.exe` and `Client.exe` use shared frontend workflows via bindings/RPC. It extends the architecture’s Epic 3 mapping (`CreateGRN`, stock update domain logic) by expanding current `grns`/`batches` persistence into procurement-grade transactional models (line-level receipt details, lot identity, reconciliation entries, and audit-friendly stock movements).

Design constraints from PRD/UX/architecture remain binding: offline LAN operation, role-safe access (Admin + Operator for procurement routes), keyboard-first GRN data entry, optimistic locking semantics for editable records, and immutable historical transaction traces that feed downstream valuation and reporting layers.

## Detailed Design

### Services and Modules

| Service/Module | Responsibilities | Inputs | Outputs/Side Effects | Owner |
| --- | --- | --- | --- | --- |
| `InventoryService` (`internal/app/inventory/service.go`) | Orchestrate procurement write/read actions under license-mode and auth context; map concurrency and validation errors | GRN/reconciliation DTOs, auth token, item/supplier refs | Persisted transactions or mapped service errors | Backend app layer |
| `SqliteInventoryRepository` (`internal/infrastructure/db/sqlite_inventory_repository.go`) | Persist procurement entities and enforce DB-level integrity/optimistic locking | Domain entities (`GRN`, future lot/reconciliation entities) | Rows in `grns` and related inbound tables; conflict detection via `updated_at` | Infrastructure |
| `Server API Router` (`cmd/server/api_server.go`) | Expose procurement inventory endpoints under server HTTP API contract | JSON request payloads + auth token | JSON responses and HTTP status mapping (`400/401/403/409`) | Backend API |
| `Procurement UI Route` (`procurement.grn`) | Provide operator/admin GRN entry and review workflow, keyboard-first behavior | User form input, item/party lookups, auth context | GRN submission requests, validation feedback, draft-recovery behavior | Frontend |
| `Procurement Lots Route` (`procurement.lots`) | Provide lot visibility and traceability surface for inbound materials | Lot-linked GRN data | Lot list/filter views for quality and recall workflows | Frontend |
| `Stock Movement/Audit Integration` | Record inbound and reconciliation effects into immutable inventory history aligned to PRD audit requirements | GRN receipts, manual adjustments, actor identity, reason codes | Ledger-compatible stock events and audit entries | Domain + infrastructure |

### Data Models and Contracts

Current persisted procurement entity in codebase:

`grns` (implemented)
- `id` (INTEGER, PK, autoincrement)
- `grn_number` (TEXT, UNIQUE, required)
- `supplier_name` (TEXT, required)
- `invoice_no` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `created_at`, `updated_at` (DATETIME)

Related implemented inventory entity reused by downstream flows:

`batches` (implemented)
- `id` (INTEGER, PK, autoincrement)
- `batch_number` (TEXT, UNIQUE, required)
- `item_id` (INTEGER, FK -> `items.id`)
- `quantity` (REAL, required)
- `created_at`, `updated_at` (DATETIME)

Epic 3 procurement model extensions required by PRD/Epic stories:

`grn_lines` (planned for Story 3.1/3.3)
- `id` (INTEGER/UUID, PK)
- `grn_id` (FK -> `grns.id`)
- `item_id` (FK -> `items.id`; allowed item types: `RAW`, `PACKING_MATERIAL`, `BULK_POWDER`)
- `quantity_received` (REAL > 0)
- `unit` (TEXT; normalized through unit conversion rules where needed)
- `unit_price` (REAL >= 0)
- `line_total` (REAL >= 0, derived or persisted)
- `source_type` (TEXT enum: `INTERNAL_PROCUREMENT`, `EXTERNAL_BULK`)

`material_lots` (planned for Story 3.2)
- `id` (INTEGER/UUID, PK)
- `lot_number` (TEXT, UNIQUE, generated pattern such as `LOT-YYYYMMDD-###`)
- `grn_line_id` (FK -> `grn_lines.id`)
- `item_id` (FK -> `items.id`)
- `supplier_id` (FK -> `parties.id`, nullable when legacy `supplier_name` used)
- `received_qty` (REAL > 0)
- `expiry_date` (DATE, nullable but required where policy applies)
- `is_external_source` (BOOLEAN for third-party bulk traceability)

`stock_adjustments` (planned for Story 3.4)
- `id` (INTEGER/UUID, PK)
- `item_id` (FK -> `items.id`)
- `lot_id` (FK -> `material_lots.id`, nullable for non-lot items)
- `qty_delta` (REAL; positive/negative correction)
- `reason_code` (TEXT, required: audit correction/spoilage/etc.)
- `notes` (TEXT, optional)
- `created_by` (user reference)
- `created_at` (DATETIME)

Contract constraints:
- Receipt quantity must be strictly positive (`Story 3.1` technical note).
- Procurement of packing components remains line-item based; grouping happens only during packing execution (`FR-009A` dependency note in epics).
- Reconciliation must create correcting entries rather than mutating/deleting original transactions (`Story 3.4` technical note).

### APIs and Interfaces

Current procurement-relevant interfaces in repository/service layers:

| Interface/API | Signature/Path | Request Model | Response Model | Error Codes/Behavior |
| --- | --- | --- | --- | --- |
| Repository create GRN | `Repository.CreateGRN(grn *GRN) error` | `GRN{grn_number,supplier_name,invoice_no,notes}` | persisted GRN ID/timestamps | DB unique conflict, storage errors |
| Repository update GRN | `Repository.UpdateGRN(grn *GRN) error` | `GRN{...,updated_at}` | updated timestamp | `ErrConcurrencyConflict` mapped when stale `updated_at` |
| Service create GRN | `Service.CreateGRN(grn *GRN) error` | domain GRN object under license write-access | success/error | blocked in read-only license mode |
| Service update GRN | `Service.UpdateGRN(grn *GRN) error` | domain GRN object with optimistic-lock token | success/error | returns `"Record modified by another user. Reload required."` on conflict |

Existing HTTP inventory gateway pattern to follow for Epic 3 endpoints:
- Base style: `/inventory/<domain>/<action>` (`cmd/server/api_server.go`).
- Transport: JSON POST with token-aware application handlers and mapped HTTP statuses.

Epic 3 endpoint set (planned, aligned to existing router style):
- `POST /inventory/grns/create` -> create GRN header + lines transaction
- `POST /inventory/grns/update` -> edit allowed mutable GRN fields with optimistic lock
- `POST /inventory/grns/list` -> filter/search/paginated procurement history
- `POST /inventory/lots/list` -> lot traceability listing/filtering
- `POST /inventory/reconciliation/create` -> create stock adjustment with mandatory reason code

Expected status mapping pattern:
- `400` validation failures (quantity <= 0, missing reason code, invalid item type)
- `401` missing/invalid token
- `403` forbidden role or read-only license mode
- `409` optimistic-lock conflict / duplicate number conflicts

### Workflows and Sequencing

Inbound workflow sequencing for Epic 3:

1. GRN creation (Story 3.1)
- Operator opens `procurement.grn` (route contract from `docs/navigation-rbac-contract.md`).
- Select supplier (from parties master), enter invoice metadata, add line items.
- System validates item type eligibility and quantity > 0.
- On commit, system persists GRN + lines transactionally and emits stock-in movement records.

2. Lot generation linkage (Story 3.2)
- After GRN save, lot IDs are generated for each line requiring lot traceability.
- Lot records bind item, supplier reference, and received quantity to the originating GRN line.
- Subsequent movements reference lot IDs for recall/audit continuity.

3. Third-party bulk intake (Story 3.3)
- GRN flow allows `BULK_POWDER` inbound lines under external-source classification.
- Receipt posts into bulk stock pool and remains marked for external traceability.
- Packing workflows later consume this stock using the same traceable source linkage.

4. Stock reconciliation and audit correction (Story 3.4)
- Authorized user records physical-vs-system variance with mandatory reason code.
- System writes adjustment transaction (+/- delta), never deletes prior entries.
- Adjustment events are added to immutable audit/ledger streams.

5. Reorder visibility loop
- Procurement views derive low-stock indicators from item `minimum_stock` and live balances.
- Alerts inform replenishment actions but do not replace PO workflow (outside this epic scope).

## Non-Functional Requirements

### Performance

- GRN form load and primary procurement pages should meet PRD baseline of < 2 seconds for initial render in LAN deployment.
- Procurement search/list interactions (item, supplier, recent GRNs/lots) should return first results within < 500 ms under expected concurrency (4-5 users).
- GRN commit (header + lines + lot generation where applicable) should complete within 1 second for typical inbound entries, with non-blocking UI feedback.
- Reconciliation entry save should provide immediate confirmation and avoid full-page reload patterns to preserve keyboard-first operator throughput.

### Security

- Role enforcement must follow existing backend-authoritative RBAC boundaries: procurement create/edit actions available only to authenticated Admin/Operator roles allowed by module policy.
- All procurement write operations must remain subject to license write-mode enforcement (read-only/grace behavior blocks transaction creation/edits).
- Sensitive stock adjustments require immutable actor attribution (who/when/what changed), aligned with PRD audit trail requirements.
- Inbound data handling must preserve local/offline security model from architecture: LAN-only server API exposure and authenticated token use for protected requests.

### Reliability/Availability

- Procurement transactions must be atomic: GRN header, line items, and associated lot rows (when applicable) should commit or rollback together.
- Optimistic locking semantics must be preserved on editable records (`updated_at` conflict mapping) to prevent silent overwrite across concurrent users.
- Reconciliation behavior must degrade safely: invalid corrections are rejected with explicit reason and no partial stock mutation.
- Offline-first constraint applies fully: inbound workflows must function without internet dependency and recover using existing resilience patterns from Epic 1 (draft recovery, reconnect handling).

### Observability

- Emit structured logs for procurement operations: `operation`, `grn_id`, `lot_id` (if applicable), `actor`, `result`, `latency_ms`.
- Track metrics for inbound endpoints: request count, p95 latency, validation-failure rate, conflict rate, and write-denial due to license mode.
- Capture explicit audit events for stock-impacting actions (GRN create/update, reconciliation adjustments) to support later reporting and forensic traceability.
- Surface operator-visible error states that are deduplicated and actionable (consistent with UX conformance requirements from prior epic hardening).

## Dependencies and Integrations

| Dependency / Integration | Version / Constraint | Epic 3 Use | Notes |
| --- | --- | --- | --- |
| Go | `1.26` | Backend procurement services, repository logic, API handlers | Defined in `go.mod` |
| Wails | `github.com/wailsapp/wails/v2 v2.11.0` | Shared desktop frontend with server/client runtime modes | Existing architecture foundation |
| SQLite driver | `github.com/mattn/go-sqlite3 v1.14.34` | GRN/lot/reconciliation persistence on server node | Existing DB adapter |
| DB migrations | `github.com/golang-migrate/migrate/v4 v4.18.2` | Schema evolution for new procurement tables | Required for Epic 3 table additions |
| JWT | `github.com/golang-jwt/jwt/v5 v5.3.1` | Auth token validation on procurement API operations | Existing auth/session infrastructure |
| React | `^19.0.0` | Procurement GRN/lots UI surfaces | Existing frontend runtime |
| React Router | `^6.30.3` | Route contract for `procurement.grn` and `procurement.lots` | Must stay aligned with `docs/navigation-rbac-contract.md` |
| Ant Design | `^6.2.1` | Data-entry forms/tables for inbound operations | Supports keyboard-first workflow |
| TanStack Query | `^5.66.0` | Procurement list caching and refresh behaviors | Existing data-fetch strategy |
| Axios | `^1.7.9` | API transport utilities for server inventory endpoints | Existing frontend integration layer |
| Vitest + Testing Library | `^4.0.18`, `^16.3.0` | UI and API contract regression coverage for Epic 3 | Existing test harness |

Internal integration points:
- `internal/app/inventory/service.go`: procurement write path and concurrency/licensing behaviors.
- `internal/infrastructure/db/sqlite_inventory_repository.go`: current GRN/batch persistence and extension point for lot/reconciliation tables.
- `cmd/server/api_server.go`: HTTP route/error mapping pattern for new procurement endpoints.
- `frontend/src/components/forms/GRNForm.tsx`: existing GRN UI baseline with auto-draft integration from resilience work.
- `docs/navigation-rbac-contract.md`: authoritative route/module ownership and role access for procurement screens.

## Acceptance Criteria (Authoritative)

1. The system allows recording a GRN for inbound `RAW` and `PACKING_MATERIAL` items and increases stock based on received quantities. (`FR-001`)
2. Each GRN enforces quantity validation where every line quantity must be greater than zero before save. (Story 3.1 technical note)
3. The system captures supplier reference and invoice number on GRN records for procurement traceability. (Story 3.1)
4. The system generates a unique internal lot number for inbound material receipts and stores lot linkage to originating GRN records. (`FR-002`, Story 3.2)
5. Lot-linked stock movements preserve traceability so inbound materials can be tracked through subsequent inventory operations. (`FR-002`)
6. The system supports third-party bulk procurement through GRN flow, classifying received stock as bulk and available for packing workflows. (`FR-010`, `FR-011`, Story 3.3)
7. Third-party bulk receipts retain explicit external-source traceability metadata for downstream audits. (Story 3.3)
8. The system supports stock reconciliation entries that adjust system stock to physical counts through correcting (+/-) transactions, not destructive edits. (`FR-004`, Story 3.4)
9. Stock reconciliation requires a mandatory reason code and records the adjustment in the audit trail. (`FR-004`, PRD Audit Trail requirement)
10. Procurement screens expose stock-level visibility required to identify below-threshold inventory for reorder awareness. (`FR-003`)
11. Procurement write actions are blocked when license state enforces read-only/grace restrictions. (PRD license grace/read-only behavior + existing service guard)
12. Procurement endpoints enforce authenticated role-based access consistent with route/module policy for Admin and Operator roles. (PRD RBAC + navigation contract)

## Traceability Mapping

| AC | Spec Section(s) | Component(s)/API(s) | Test Idea |
| --- | --- | --- | --- |
| AC1 | Detailed Design -> Workflows (GRN creation); Data Models | `procurement.grn`, `CreateGRN`, `grns` + planned `grn_lines` | Submit GRN with valid raw/packing lines and assert stock increase events |
| AC2 | Data Models and Contracts; APIs/Interfaces | GRN validation layer in service/API | Submit line quantity `0` or negative and assert `400 validation_failed` |
| AC3 | Data Models (`grns`); Workflows | `grns.supplier_name`, `grns.invoice_no` | Create GRN and verify supplier/invoice persisted |
| AC4 | Data Models (`material_lots` planned); Workflows (lot generation) | Lot generator + GRN linkage | Save GRN and verify generated unique lot number format and FK link |
| AC5 | Workflows and Sequencing (lot linkage) | lot-aware stock movement records | Trace a lot from receipt to subsequent movement reference |
| AC6 | Scope + Workflows (third-party bulk) | GRN create flow with `BULK_POWDER` | Receive external bulk via GRN and verify bulk stock availability |
| AC7 | Data Models (source metadata) | `source_type`/external flag on inbound lot/line | Assert external-source marker exists on third-party receipt |
| AC8 | Scope + Workflows (reconciliation) | reconciliation create endpoint + stock adjustment persistence | Record physical/system variance and verify corrective delta transaction |
| AC9 | NFR Security/Observability + Data Models | mandatory `reason_code`, audit event emission | Attempt reconciliation without reason -> reject; with reason -> audit row created |
| AC10 | NFR Performance + Scope (reorder awareness) | procurement list/stock indicators using `minimum_stock` | Seed low stock and assert UI/API flags item as below threshold |
| AC11 | NFR Security + Dependencies | `appLicenseMode.RequireWriteAccess` in procurement writes | Put app in read-only/grace mode and verify create/update blocked |
| AC12 | NFR Security + Architecture Alignment | token auth + RBAC in API/service layers | Call procurement write as unauthorized/forbidden role and assert `401/403` |

## Risks, Assumptions, Open Questions

- Risk: Current implemented GRN model is header-only (`supplier_name`, `invoice_no`, `notes`) and does not yet persist line-level item/qty/cost details required by Story 3.1.
  Mitigation/Next step: Add migration and transactional repository methods for `grn_lines` before Epic 3 story implementation begins.
- Risk: Lot tracking schema is not yet present, which blocks strict inbound traceability and recall-readiness.
  Mitigation/Next step: Prioritize lot table design and generation rules in Story 3.2 implementation kickoff.
- Risk: Existing GRN uses free-text supplier name while Epic 2 introduced structured `parties`; divergence can create reference drift.
  Mitigation/Next step: Migrate GRN supplier linkage toward party IDs while preserving backward compatibility where needed.
- Risk: Without immutable stock adjustment entities, reconciliation may be implemented as direct balance edits, violating audit expectations.
  Mitigation/Next step: Enforce correction-entry-only pattern and require reason codes at API and DB levels.
- Assumption: Epic 2 master data (items, parties, conversions, packaging profiles) remains available and stable as upstream dependency.
- Assumption: Procurement routes (`procurement.grn`, `procurement.lots`) and role policy from navigation contract remain authoritative.
- Assumption: Existing license/read-only enforcement and authentication/session infrastructure from Epic 1/2 remain unchanged.
- Question: Should lot generation occur per GRN line or per split lot segment when one line is partially accepted/rejected?
  Next step: Resolve with product owner before finalizing lot model behavior.
- Question: Is weighted-average cost update required at GRN commit in Epic 3, or deferred until broader valuation workflows?
  Next step: Confirm valuation timing with reporting/accounting expectations.

## Test Strategy Summary

- Unit tests:
- Validate GRN request rules (item eligibility, quantity > 0, required references).
- Validate lot number generation uniqueness/format and reconciliation reason-code enforcement.
- Validate license-mode and RBAC guards for procurement write actions.

- Integration tests:
- Repository transaction tests for GRN header + lines + lots commit/rollback behavior.
- Concurrency tests for GRN update conflict path (`updated_at` optimistic locking).
- Reconciliation persistence tests verifying correction entries are append-only and auditable.

- API contract tests:
- Add server API tests for planned procurement endpoints (`/inventory/grns/*`, `/inventory/lots/list`, `/inventory/reconciliation/create`) including success/error status mapping.
- Include negative-path coverage for validation (`400`), unauthorized (`401`), forbidden (`403`), and conflict (`409`).

- UI/component tests:
- Extend GRN form tests for keyboard-first entry, validation messages, and draft recovery behavior.
- Add lots-view tests for filtering/traceability data rendering.
- Add read-only license-mode assertions that disable or block procurement submits.

- AC coverage strategy:
- Maintain direct mapping from AC1-AC12 to automated tests (at least one test per AC).
- Prioritize critical-path regressions first: inbound stock accuracy, lot traceability, and reconciliation audit integrity.
