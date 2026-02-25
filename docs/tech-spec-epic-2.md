# Epic Technical Specification: Master Data & Configuration

Date: 2026-02-25
Author: darko
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 establishes the master data backbone for the factory’s digital twin by defining authoritative records for items, units, recipes (BOM), suppliers, and customers. This epic transforms foundational business definitions into enforceable system configuration so later inbound, production, packing, and sales flows operate on consistent, validated entities.

The technical objective is to implement stable domain models and CRUD/application workflows that preserve data quality, unit correctness, and traceability readiness. It directly enables future epics by ensuring stock movements and cost logic reference standardized item types, conversion rules, and recipe structures rather than ad hoc operator input.

## Objectives and Scope

- In-scope:
- Implement Item Master management for RAW, BULK_POWDER, PACKING_MATERIAL, and FINISHED_GOOD classifications with base unit metadata.
- Implement packing-material subtype classification and packaging consumption profiles to support multi-component pack configurations (for example jar body + lid + cup sticker consumed together).
- Implement unit-conversion rules that standardize internal calculations in base units while supporting operator-facing units (for example KG and grams).
- Implement Recipe/BOM management (header + line items) for bulk products, including expected wastage percentage used later for yield benchmarking.
- Implement Supplier and Customer master CRUD with key operational metadata (contact and lead-time where applicable).
- Enforce master-data validations and referential integrity so downstream transactions can rely on these records safely.

- Out-of-scope:
- Procurement transaction execution (GRN and lot intake) beyond using masters defined here.
- Production batch execution, material consumption posting, and value-add costing logic.
- Packing, dispatch, invoice generation, and reporting workflows.
- ERP/cloud/mobile integrations and advanced forecasting capabilities.

## System Architecture Alignment

This epic maps to the architecture’s domain/application layers for master entities and command/query flows, implemented in the distributed Wails setup where the server remains the single source of truth. Domain models and validation rules reside in backend services/repositories, while React + Ant Design forms/tables provide operator/admin CRUD experiences through the existing Wails binding and LAN RPC pattern.

It aligns specifically with the architecture mapping for Epic 2 (`internal/domain/models`, `internal/app/commands`) and prepares canonical data required by Epic 3+ transaction modules. Design constraints from PRD/UX are preserved: keyboard-first data entry, role-based access boundaries, and support for offline-first LAN deployment.

## Detailed Design

### Services and Modules

| Service/Module | Responsibilities | Inputs | Outputs/Side Effects | Owner |
| --- | --- | --- | --- | --- |
| `ItemMasterService` | Create/update/archive item masters; enforce type/base-unit constraints and uniqueness checks | Item DTO (name, code, type, base_unit, thresholds, flags) | Persisted item records; validation errors; audit events | Backend (Go app layer) |
| `UnitConversionService` | Resolve and validate conversions between buying/usage/display units with precision-safe math | Source unit, target unit, quantity, item/base unit metadata | Converted quantity, precision/rounding validation results | Domain service |
| `RecipeService` | Manage BOM headers/details for bulk products and expected wastage percentages | Recipe header + component lines (item refs, quantities, units, wastage%) | Persisted recipe and components; version/update audit | Backend (Go app layer) |
| `PackagingProfileService` | Create/update profile definitions that map one packing mode to multiple packing-material components and per-unit quantities | Profile header + component lines (packing material item refs, qty per unit) | Persisted profile mappings used by packing deduction flows | Backend (Go app layer) |
| `PartyMasterService` | CRUD for suppliers/customers and operational metadata | Party DTO (type, name, contacts, lead_time, status) | Persisted party records; searchable listings | Backend (Go app layer) |
| `MasterValidationPolicy` | Shared cross-entity rules (mandatory fields, status constraints, referential integrity) | Candidate mutations across master entities | Consistent validation outcomes and normalized error payloads | Domain policy |
| `MasterAdminUI` | Role-aware CRUD screens and keyboard-first data-entry forms for masters | Wails binding/RPC responses + operator input | Ant Design tables/forms, inline validation, optimistic feedback | Frontend |

### Data Models and Contracts

Normalized entities derived from Epic 2 stories and architecture mapping:

`items`
- `id` (UUID, PK)
- `item_code` (TEXT, UNIQUE, required)
- `name` (TEXT, required)
- `item_type` (TEXT enum: `RAW`, `BULK_POWDER`, `PACKING_MATERIAL`, `FINISHED_GOOD`)
- `item_subtype` (TEXT, nullable; used primarily when `item_type = PACKING_MATERIAL`, e.g., `JAR_BODY`, `JAR_LID`, `CUP_STICKER`)
- `base_unit` (TEXT, required; canonical storage unit)
- `is_active` (BOOLEAN, default true)
- `reorder_level` (DECIMAL(18,4), nullable)
- `created_at`, `updated_at` (TIMESTAMP)

`unit_conversions`
- `id` (UUID, PK)
- `item_id` (UUID, FK -> `items.id`, nullable when global conversion applies)
- `from_unit` (TEXT, required)
- `to_unit` (TEXT, required)
- `factor` (DECIMAL(18,8), required; multiply rule)
- `precision_scale` (INTEGER, default 4)
- `rounding_mode` (TEXT enum: `HALF_UP`, `DOWN`, `UP`)
- Unique constraint on (`item_id`, `from_unit`, `to_unit`)

`recipes`
- `id` (UUID, PK)
- `recipe_code` (TEXT, UNIQUE, required)
- `output_item_id` (UUID, FK -> `items.id`, required; should reference `BULK_POWDER`)
- `output_qty_base` (DECIMAL(18,4), required)
- `expected_wastage_pct` (DECIMAL(5,2), default 0)
- `is_active` (BOOLEAN, default true)
- `created_at`, `updated_at` (TIMESTAMP)

`recipe_components`
- `id` (UUID, PK)
- `recipe_id` (UUID, FK -> `recipes.id`, required)
- `input_item_id` (UUID, FK -> `items.id`, required)
- `input_qty_base` (DECIMAL(18,4), required)
- `line_no` (INTEGER, required)
- Unique constraint on (`recipe_id`, `line_no`)

`parties`
- `id` (UUID, PK)
- `party_type` (TEXT enum: `SUPPLIER`, `CUSTOMER`)
- `name` (TEXT, required)
- `phone` (TEXT, nullable)
- `email` (TEXT, nullable)
- `address` (TEXT, nullable)
- `lead_time_days` (INTEGER, nullable; used primarily for suppliers)
- `is_active` (BOOLEAN, default true)
- `created_at`, `updated_at` (TIMESTAMP)

`packaging_profiles`
- `id` (UUID, PK)
- `profile_code` (TEXT, UNIQUE, required)
- `name` (TEXT, required)
- `pack_output_item_id` (UUID, FK -> `items.id`, required; expected item type `FINISHED_GOOD`)
- `is_active` (BOOLEAN, default true)
- `created_at`, `updated_at` (TIMESTAMP)

`packaging_profile_components`
- `id` (UUID, PK)
- `profile_id` (UUID, FK -> `packaging_profiles.id`, required)
- `packing_material_item_id` (UUID, FK -> `items.id`, required; expected item type `PACKING_MATERIAL`)
- `qty_per_unit` (DECIMAL(18,4), required)
- `line_no` (INTEGER, required)
- Unique constraint on (`profile_id`, `line_no`)

Contract notes:
- Internal calculations should use base-unit quantities; UI-level units are converted via `UnitConversionService`.
- Recipe components should be stored in normalized quantities to avoid repeated conversion drift.
- Packaging profile components should be persisted as normalized per-unit quantities and consumed atomically in packing transactions.
- Foreign-key enforcement and unique constraints are mandatory to prevent orphaned BOM lines and duplicate masters.

### APIs and Interfaces

Primary application interfaces (Wails bindings / RPC service contracts):

| Method | Signature / Path | Request Model (summary) | Response Model (summary) | Error Cases |
| --- | --- | --- | --- | --- |
| `CreateItem` | `ItemService.CreateItem(input)` | `name, item_code, item_type, base_unit, reorder_level` | `item_id, created_at` | validation failed, duplicate code/name, unauthorized |
| `UpdateItem` | `ItemService.UpdateItem(id, patch)` | mutable fields + optimistic lock token (`updated_at`) | updated item snapshot | not found, optimistic conflict, validation failed |
| `ListItems` | `ItemService.ListItems(filter)` | type/status/search/paging | paged items list | unauthorized |
| `CreateConversionRule` | `UnitService.CreateRule(input)` | `item_id?`, `from_unit`, `to_unit`, `factor`, precision | conversion rule id | invalid factor, duplicate rule |
| `ConvertQuantity` | `UnitService.Convert(input)` | `item_id?`, `qty`, `from_unit`, `to_unit` | `qty_converted`, `precision_meta` | rule missing, precision overflow |
| `CreateRecipe` | `RecipeService.CreateRecipe(input)` | header + components array | `recipe_id` | invalid output item type, duplicate line, missing component item |
| `UpdateRecipe` | `RecipeService.UpdateRecipe(id, input)` | updated header/components + lock token | updated recipe snapshot | not found, optimistic conflict |
| `ListRecipes` | `RecipeService.ListRecipes(filter)` | output item/status/search | paged recipes | unauthorized |
| `CreateParty` | `PartyService.CreateParty(input)` | `party_type`, `name`, contact, lead_time | `party_id` | validation failed, duplicate name policy violation |
| `ListParties` | `PartyService.ListParties(filter)` | type/status/search/paging | paged parties list | unauthorized |
| `CreatePackagingProfile` | `PackagingProfileService.CreateProfile(input)` | header + component array (`packing_material_item_id`, `qty_per_unit`) | `profile_id` | invalid component type, duplicate line, missing component |
| `ListPackagingProfiles` | `PackagingProfileService.ListProfiles(filter)` | status/search/output item | paged profiles list | unauthorized |

Authorization interface expectations:
- Admin: full CRUD on all master domains.
- Data Entry Operator: read access to masters needed for operational forms; create/update scope per policy.

### Workflows and Sequencing

Master setup sequencing for Epic 2:

1. Item master configuration
- Admin/Data Entry opens Item Master screen.
- Create each item with canonical `item_type` and `base_unit`.
- System validates uniqueness and enum constraints before commit.

2. Conversion rule setup
- For applicable items, define unit conversion from operational units (for example grams) to base units (KG).
- System validates non-zero factors and bidirectional consistency rules where configured.

3. Packaging profile setup (for composite pack consumption)
- Define reusable pack profiles (for example `Jar Pack`) with required packing-material components and per-unit quantities.
- System validates that all referenced components are active `PACKING_MATERIAL` items.

4. Recipe/BOM definition
- User selects bulk output item and defines standard output quantity.
- User adds component lines (raw items + normalized quantities) and expected wastage %.
- System validates component references and persists recipe header/details transactionally.

5. Supplier/customer registration
- Admin creates supplier/customer records with contacts and optional supplier lead-time.
- Records become available as references for inbound/outbound workflows in later epics.

6. Operational consumption readiness check
- Downstream modules query active items, conversions, recipes, and parties.
- Missing masters block dependent transaction creation with actionable validation errors.

## Non-Functional Requirements

### Performance

- Master list and lookup queries (items, recipes, parties) should return first page results within 500 ms under expected concurrency (4-5 LAN users), aligned with PRD search target.
- Master screen initial load (table + reference data) should complete within 2 seconds in LAN deployment, aligned with PRD dashboard/form load target.
- Unit conversion operations must be deterministic and low-latency (<50 ms service-side for single conversion call) to avoid form-entry lag.
- Recipe create/update transactions should complete within 1 second for typical BOM sizes used in this domain (single-digit to low double-digit line counts).

### Security

- RBAC enforcement must apply to all master CRUD interfaces so valuation-sensitive or admin-only operations remain restricted per role definitions in PRD.
- Authentication context (session token) is required for all write operations; unauthorized access returns explicit authorization errors.
- Master mutations (create/update/archive) must emit audit records with actor, timestamp, action, and changed fields to support PRD auditability goals.
- Input validation and server-side canonicalization are mandatory to prevent malformed units, invalid enum values, and unsafe payload persistence.

### Reliability/Availability

- Master write operations should be atomic and durable using SQLite transactional guarantees; partial recipe header/detail writes are not permitted.
- Optimistic locking (`updated_at` or equivalent token) must protect concurrent edits of the same master records, consistent with PRD data-integrity direction.
- Service behavior must remain fully functional in offline LAN mode (no internet dependency) consistent with overall product constraints.
- On validation/config dependency failures (for example missing conversion rule), API responses should degrade gracefully with actionable error messages rather than silent fallback or implicit assumptions.

### Observability

- Emit structured logs for all master domain operations with correlation identifiers: entity type, entity id, actor id, action, result, and latency.
- Publish metrics for master APIs: request count, p95 latency, error rate, and validation-failure counts by endpoint.
- Track domain signals needed by support and QA: duplicate-master attempts, conversion-rule misses, and recipe save conflicts.
- Ensure audit trail entries are queryable for reconciliation and compliance investigations (who changed what and when).

## Dependencies and Integrations

Primary dependencies and integration points discovered from repository manifests:

| Dependency / Integration | Version / Constraint | Purpose in Epic 2 | Integration Notes |
| --- | --- | --- | --- |
| Go toolchain | `1.26` | Backend domain/app services for master data | Defined in `go.mod`; server-side validation and transactions |
| Wails | `github.com/wailsapp/wails/v2 v2.11.0` | Desktop shell + frontend/backend bridge | Master CRUD exposed through Wails bindings and LAN client proxy pattern |
| SQLite driver | `github.com/mattn/go-sqlite3 v1.14.34` | Persistence for items, recipes, parties, conversion rules | Single source of truth on server node |
| DB migrations | `github.com/golang-migrate/migrate/v4 v4.18.2` | Versioned schema evolution for master tables | Migration-first schema management |
| JWT library | `github.com/golang-jwt/jwt/v5 v5.3.1` | Session/auth token support for role-aware access | Supports RBAC enforcement boundaries |
| Crypto primitives | `golang.org/x/crypto v0.35.0` | Password hashing/security primitives | Shared security baseline from core architecture |
| React | `^19.0.0` | Master-data UI screens | Frontend consumes backend interfaces via bindings |
| React Router | `^6.30.3` | Navigation across master modules | Route-level role gating and form flows |
| Ant Design | `^6.2.1` | Form/table components for data-heavy CRUD | Keyboard-first data-entry UX support |
| TanStack Query | `^5.66.0` | Server-state caching/invalidation for master lists | Improves responsiveness for repeated master lookups |
| Axios | `^1.7.9` | HTTP transport utility (where applicable in client networking) | Used in frontend data-access utilities |
| Vitest + Testing Library | `^4.0.18`, `^16.3.0` | Unit/component test harness for master forms/services | Supports AC verification for validation and error UX |

External integrations in scope for this epic:
- No third-party SaaS/internet integrations required.
- Internal integrations are with existing authentication/RBAC middleware, migration pipeline, and audit logging infrastructure established in Epic 1.

## Acceptance Criteria (Authoritative)

1. The system allows creation of item master records with required fields (`name`, `item_type`, `base_unit`) and persists them successfully.
2. Item type assignment is restricted to supported categories (`RAW`, `BULK_POWDER`, `PACKING_MATERIAL`, `FINISHED_GOOD`) and rejects unsupported values.
3. The unit conversion engine converts usage quantities (for example grams) to base units (for example KG) accurately using configured conversion factors.
4. Conversion calculations preserve configured precision rules and prevent invalid rounding drift beyond defined precision scale.
5. The system allows creation and maintenance of recipe/BOM definitions with one output item and one or more input component lines.
6. Recipe definitions support capture of expected wastage percentage for later yield benchmarking use.
7. Supplier master records can be created and updated with contact details and optional lead-time metadata.
8. Customer master records can be created and updated with contact details.
9. Master-domain persistence enforces referential integrity (for example recipe component lines cannot reference non-existent items).
10. Master data created in this epic is discoverable and usable by downstream workflows via list/query interfaces.
11. Packing-material item masters support subtype tags for operational grouping without changing item-level stock ownership.
12. Packaging consumption profiles can map one pack mode to multiple packing-material components and quantities for atomic deduction in packing workflows.

## Traceability Mapping

| AC | Spec Section(s) | Component(s)/API(s) | Test Idea |
| --- | --- | --- | --- |
| AC1 | Detailed Design -> Services and Modules; Data Models and Contracts | `ItemMasterService.CreateItem`, `items` table | Create valid item and verify DB row + response payload |
| AC2 | Data Models and Contracts; APIs and Interfaces | `CreateItem` validation policy | Attempt create with invalid `item_type`; expect validation error |
| AC3 | Detailed Design -> Services; APIs and Interfaces | `UnitConversionService.ConvertQuantity` | Convert 500 g to KG and assert `0.5` |
| AC4 | Non-Functional Requirements -> Performance/Reliability; Data Models | `UnitConversionService`, `unit_conversions` precision fields | Execute edge conversions and assert scale/rounding bounds |
| AC5 | Detailed Design -> Data Models; Workflows and Sequencing | `RecipeService.CreateRecipe`, `recipes`, `recipe_components` | Create BOM header+lines and verify transactional persistence |
| AC6 | Data Models and Contracts | `recipes.expected_wastage_pct` | Save recipe with wastage % and validate stored value/range |
| AC7 | Detailed Design -> Party service and models | `PartyService.CreateParty` (`SUPPLIER`) | Create supplier with lead time/contact and verify retrieval |
| AC8 | Detailed Design -> Party service and models | `PartyService.CreateParty` (`CUSTOMER`) | Create customer with contact and verify retrieval |
| AC9 | Data Models and Contracts; Reliability | DB FK constraints + validation policy | Submit recipe component with unknown item id; expect rejection |
| AC10 | APIs and Interfaces; Workflows and Sequencing | `ListItems`, `ListRecipes`, `ListParties` | Query masters and confirm results available for dependent modules |
| AC11 | Data Models and Contracts | `items.item_subtype` | Create packing-material item with subtype and verify persistence/query |
| AC12 | Services and Modules; APIs and Interfaces | `PackagingProfileService.CreatePackagingProfile`, `packaging_profiles`, `packaging_profile_components` | Create jar profile with 3 components and verify mapping integrity |

## Risks, Assumptions, Open Questions

- Risk: Inconsistent or duplicate item definitions (same material entered under variant names/codes) could degrade downstream stock and valuation accuracy.
  Mitigation/Next step: Enforce uniqueness policies (`item_code`, normalized-name checks), introduce controlled vocab where needed, and add duplicate-detection validation tests.
- Risk: Incorrect conversion factors can silently corrupt quantity calculations across procurement/production/packing.
  Mitigation/Next step: Require explicit conversion-rule review at setup, add boundary/unit tests for common conversions, and expose conversion audit logs.
- Risk: Recipe/BOM changes without governance may cause operational confusion and mismatch between expected and actual yield.
  Mitigation/Next step: Track recipe version metadata and audit events; require privileged role for critical recipe edits.
- Assumption: Master data administration is primarily done by trained Admin/Data Entry roles familiar with factory terminology and units.
- Assumption: Epic 1 auth/RBAC, migration, and audit infrastructure remains stable and available to Epic 2 services.
- Assumption: Canonical internal unit storage is acceptable for all Epic 2 entities and downstream calculations.
- Question: Should item archival (inactive) be allowed when the item is referenced by active recipes, or should this require replacement workflow?
  Next step: Decide policy before implementation to avoid inconsistent dependency behavior.
- Question: Do supplier and customer masters require GST/tax identifiers in MVP, or is contact + lead-time sufficient for current scope?
  Next step: Confirm with product owner before schema finalization.

## Test Strategy Summary

- Unit tests:
- Domain validation tests for item type enums, required fields, uniqueness helpers, and conversion precision/rounding logic.
- Recipe validation tests for header/detail coherence, minimum component count, and expected wastage range.

- Integration tests:
- Repository and migration tests for `items`, `unit_conversions`, `recipes`, `recipe_components`, and `parties` schema constraints.
- Transactional tests ensuring recipe header/details persist atomically and rollback on invalid component references.
- RBAC tests for master CRUD/list API authorization boundaries.

- API/contract tests:
- Request/response validation for create/update/list master endpoints, including standardized error payloads.
- Concurrency tests for optimistic-lock update conflicts on item and recipe edits.

- UI/component tests:
- Form validation behavior on master screens (required fields, enum options, precision inputs).
- Keyboard-first data-entry flow checks (tab order, submit, inline error display) aligned with UX requirements.

- Traceability and coverage:
- Maintain AC coverage matrix where each AC in this spec is linked to at least one automated test case.
- Prioritize edge cases: duplicate items, missing conversion rules, invalid BOM references, and stale-update conflicts.

## Post-Review Follow-ups

- Story 2.1: [High][Bug][Resolved 2026-02-25] Derive authorization role from authenticated server-side context/session instead of trusting request `actor_role`. Ref: `internal/app/inventory/service.go`
- Story 2.1: [High][Bug][Resolved 2026-02-25] Remove hardcoded `actor_role: "ADMIN"` from frontend master-data API calls and rely on server identity. Ref: `frontend/src/services/masterDataApi.ts`
- Story 2.1: [Med][Bug][Resolved 2026-02-25] Respect explicit `is_active=false` for packaging profile create path. Ref: `internal/infrastructure/db/sqlite_inventory_repository.go`
- Story 2.1: [Med][TechDebt][Resolved 2026-02-25] Add integration test for non-existent `packing_material_item_id` rejection. Ref: `internal/infrastructure/db/sqlite_inventory_repository_test.go`
- Story 2.2B: [Med][Bug][Resolved 2026-02-25] Source frontend guard role from trusted authenticated context/session binding instead of local/session storage role keys. Ref: `internal/app/app.go`, `cmd/server/main.go`, `frontend/src/App.tsx`, `frontend/src/shell/rbac.ts`
- Story 2.2B: [Med][Bug][Resolved 2026-02-25] Add regression test that tampered storage role values do not elevate effective frontend guard role beyond authenticated session context. Ref: `frontend/src/__tests__/AppShellRBAC.test.tsx`
- Story 2.2B: [Low][TechDebt][Resolved 2026-02-25] Replace deprecated Ant Design prop usage (`Space direction`, `Alert message`) with supported API to reduce warning noise and upgrade risk. Ref: `frontend/src/shell/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/shell/RoleShellNavigation.tsx`
