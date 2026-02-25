# Navigation and RBAC Contract (Story 2.2A)

Status: Approved  
Owner: Product + Engineering  
Last Updated: 2026-02-25

## Purpose

This document defines the canonical navigation and RBAC contract for the shared app used by both `Server.exe` and `Client.exe`. It is the single source of truth for route IDs, route paths, module naming, and role permissions.

## Canonical Route Map (Stable IDs and Paths)

| Route ID | Path | Module | Shell Visibility | Minimum Role |
| --- | --- | --- | --- | --- |
| `dashboard.home` | `/dashboard` | Dashboard | Admin + Operator | `operator` |
| `masters.items` | `/masters/items` | Masters | Admin + Operator | `operator` |
| `masters.recipes` | `/masters/recipes` | Masters | Admin + Operator | `operator` |
| `masters.parties` | `/masters/parties` | Masters | Admin + Operator | `operator` |
| `procurement.grn` | `/procurement/grn` | Procurement | Admin + Operator | `operator` |
| `procurement.lots` | `/procurement/lots` | Procurement | Admin + Operator | `operator` |
| `production.batches` | `/production/batches` | Production | Admin + Operator | `operator` |
| `production.execution` | `/production/execution` | Production | Admin + Operator | `operator` |
| `packing.runs` | `/packing/runs` | Packing | Admin + Operator | `operator` |
| `packing.materials` | `/packing/materials` | Packing | Admin + Operator | `operator` |
| `sales.orders` | `/sales/orders` | Sales | Admin + Operator | `operator` |
| `sales.dispatch` | `/sales/dispatch` | Sales | Admin + Operator | `operator` |
| `reports.stock-ledger` | `/reports/stock-ledger` | Reports | Admin + Operator | `operator` |
| `reports.wastage` | `/reports/wastage` | Reports | Admin + Operator | `operator` |
| `reports.audit` | `/reports/audit` | Reports | Admin + Operator | `operator` |
| `system.users` | `/system/users` | System | Admin only | `admin` |
| `system.license` | `/system/license` | System | Admin only | `admin` |
| `system.backup` | `/system/backup` | System | Admin only | `admin` |

### Route Stability Rules

1. Route IDs are immutable once consumed by implementation stories/tests.
2. Path changes require explicit changelog entry and migration note.
3. Menu composition must bind to `route_id` (not display labels).

## Module Naming and Route Ownership

| Module Name | Module Key | Owned Routes (IDs) | Primary Story Consumers |
| --- | --- | --- | --- |
| Dashboard | `dashboard` | `dashboard.home` | `2.2B`, `2.2` |
| Masters | `masters` | `masters.items`, `masters.recipes`, `masters.parties` | `2.2B`, `2.2`, `2.3`, `2.4` |
| Procurement | `procurement` | `procurement.grn`, `procurement.lots` | `2.2B`, `3.1`, `3.2` |
| Production | `production` | `production.batches`, `production.execution` | `2.2B`, `4.1`, `4.2` |
| Packing | `packing` | `packing.runs`, `packing.materials` | `2.2B`, `5.1`, `5.2` |
| Sales | `sales` | `sales.orders`, `sales.dispatch` | `2.2B`, `6.1`, `6.2` |
| Reports | `reports` | `reports.stock-ledger`, `reports.wastage`, `reports.audit` | `2.2B`, `7.1`, `7.2`, `7.3` |
| System | `system` | `system.users`, `system.license`, `system.backup` | `2.2B`, `1.x admin/security stories` |

## RBAC Contract: Role x Module x Action Matrix

Legend:
- `UI-visible`: action entry point should be visible in shell/page UI.
- `UI-hidden`: action entry point must not be visible in shell/page UI.
- `backend-allowed`: server endpoint/use case may execute for that role.
- `backend-denied`: server endpoint/use case must reject for that role.

### Admin

| Module | view | create | edit | delete | approve | view_valuation | manage_system |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Masters | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Procurement | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Production | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Packing | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Sales | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied |
| Reports | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-visible / backend-allowed | UI-hidden / backend-denied |
| System | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed |

### Data Entry Operator

| Module | view | create | edit | delete | approve | view_valuation | manage_system |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Masters | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Procurement | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Production | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Packing | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Sales | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| Reports | UI-visible / backend-allowed | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |
| System | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied | UI-hidden / backend-denied |

## Frontend vs Backend Authority (Canonical Rule)

1. Frontend visibility (`UI-visible`/`UI-hidden`) is guidance for usability and ergonomics.
2. Backend authorization (`backend-allowed`/`backend-denied`) is the security authority and must be enforced server-side.
3. Hidden UI must never be treated as authorization.
4. Any mismatch is resolved in favor of backend denial.

## Downstream Story References

This contract is a prerequisite reference for:
- `docs/stories/2-2b-app-shell-role-variants.md`
- `docs/stories/2-2c-docs-alignment-cohesive-app.md`
- `docs/epics.md` stories `2.2`, `2.3`, `2.4`

## Sign-Off

- Product Stakeholder: `[x] Approved`
- Engineering Stakeholder: `[x] Approved`
- Approval Date: `2026-02-25`
- Notes: `Approved by stakeholder in-story review session.`
