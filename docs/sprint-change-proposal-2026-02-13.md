# Sprint Change Proposal — Role Terminology Harmonization

**Date:** 2026-02-13
**Triggered By:** Story 1.4 advisory note — role terminology mismatch
**Author:** Bob (SM) + darko
**Mode:** Incremental
**Status:** ✅ APPROVED (2026-02-13)
**Scope:** Minor — Direct implementation by development team

---

## 1. Issue Summary

**Problem Statement:** The role system across the project is inconsistent — three different naming conventions exist across documentation, codebase, and UX spec:

| Source                                    | Roles Used                                                        |
| :---------------------------------------- | :---------------------------------------------------------------- |
| **Codebase** (`user.go`, `middleware.go`) | `Admin`, `Store`, `Factory`                                       |
| **PRD** (L151, L241-244)                  | `Admin`, `Storekeeper`, `Worker` (+ `Production Manager` in RBAC) |
| **Epics** (L112-119)                      | `Admin`, `Store`, `Factory`                                       |
| **Tech Spec** (L71, L161)                 | `Admin`, `Store`, `Factory`                                       |
| **UX Design Spec** (L14-15)               | `Admin`, `Data Entry Operator`                                    |

**User's Decision:** The canonical roles are **`Admin`** and **`Data Entry Operator`** — a simplified two-role model aligned with the UX Design Specification.

**Discovery:** Identified as an advisory note in Story 1.4 Review #4 (2026-02-13). The issue has grown through iterations where different agents used different role names from different source documents.

**Core Change:** Reduce from a 3-role system (`Admin` > `Store` > `Factory`) to a **2-role system** (`Admin` > `Data Entry Operator`). This simplifies RBAC, aligns with UX spec, and eliminates terminology confusion.

---

## 2. Impact Analysis

### 2.1 Epic Impact

- **Epic 1 (Core Foundation)**: Direct impact. Story 1.4 (done) implements the 3-role system. A follow-up change is needed to the existing auth code.
- **Epics 2-7**: Indirect impact. These epics reference roles in their story descriptions (e.g., "As a Store Keeper", "As a Production Manager", "As an Admin"). The role referenced in story personas must be harmonized but does NOT affect implementation logic.
- **No epics need to be added, removed, or resequenced.** This is a terminology and simplification change.

### 2.2 Artifact Impact

#### Code Files (4 files)

| File                                | Change Required                                                          |
| :---------------------------------- | :----------------------------------------------------------------------- |
| `internal/domain/auth/user.go`      | Replace `RoleStore`/`RoleFactory` with `RoleDataEntryOperator`           |
| `internal/app/auth/middleware.go`   | Simplify hierarchy from 3-tier to 2-tier (`Admin` > `DataEntryOperator`) |
| `internal/app/auth/service.go`      | Update `CreateUser` validation to accept new role                        |
| `internal/app/auth/service_test.go` | Update test cases for new role names                                     |

#### Test Files (3 files)

| File                                                        | Change Required                                            |
| :---------------------------------------------------------- | :--------------------------------------------------------- |
| `internal/app/auth/service_test.go`                         | Update role references in test assertions                  |
| `internal/app/report/service_test.go`                       | Replace `Factory` role references with `DataEntryOperator` |
| `internal/infrastructure/db/sqlite_user_repository_test.go` | Update test user creation roles                            |

#### Migration (1 file — NEW)

| File                      | Change Required                                                   |
| :------------------------ | :---------------------------------------------------------------- |
| `migrations/003_*.up.sql` | **NEW** migration to update existing role values in `users` table |

#### Documentation Files (5 files)

| File                                            | Change Required                                                                               |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `docs/PRD.md` (L151, L241-244)                  | Update roles to `Admin` / `Data Entry Operator`                                               |
| `docs/epics.md` (L112-119, story personas)      | Update Story 1.4 description and all "As a Store Keeper" / "As a Production Manager" personas |
| `docs/tech-spec-epic-1.md` (L71, L161)          | Update roles table SQL and API table                                                          |
| `docs/architecture.md` (L125-126)               | Minor update to Auth section mentioning roles                                                 |
| `docs/stories/1-4-local-authentication-rbac.md` | Update story description, ACs, and role references                                            |

#### No Impact

| Artifact                                          | Reason                                                             |
| :------------------------------------------------ | :----------------------------------------------------------------- |
| `docs/ux-design-specification.md`                 | ✅ Already uses `Admin` / `Data Entry Operator` — no change needed |
| `docs/sprint-status.yaml`                         | No role references                                                 |
| Database schema (`002_create_users_table.up.sql`) | Uses `role TEXT` — flexible, no schema change needed               |

---

## 3. Recommended Approach

**Selected: Option 1 — Direct Adjustment** ✅

| Factor        | Assessment                                                                              |
| :------------ | :-------------------------------------------------------------------------------------- |
| **Effort**    | **Low** — ~4 code files, ~5 doc files, 1 new migration                                  |
| **Risk**      | **Low** — Role is a TEXT column, no foreign keys to break. Tests will catch regressions |
| **Timeline**  | < 1 sprint (can be done as a quick follow-up story)                                     |
| **Rationale** | Clean rename + simplification. No rollback needed. No scope change.                     |

**Why not Option 2 (Rollback)?** Rolling back Story 1.4 would be overkill — the auth system works correctly. Only the role names/hierarchy need updating.

**Why not Option 3 (MVP Review)?** The MVP is not affected. This is a naming harmonization, not a scope change.

---

## 4. Detailed Change Proposals

### 4.1 Code Changes

#### `internal/domain/auth/user.go`

```
Section: Role Constants (L8-12)

OLD:
const (
	RoleAdmin   Role = "Admin"
	RoleStore   Role = "Store"
	RoleFactory Role = "Factory"
)

NEW:
const (
	RoleAdmin             Role = "Admin"
	RoleDataEntryOperator Role = "DataEntryOperator"
)

Rationale: Simplify to 2 roles per user requirement. DB value is "DataEntryOperator" (no spaces for safe storage/comparison).
```

#### `internal/app/auth/middleware.go`

```
Section: Role Hierarchy (L27-32)

OLD:
// Role Hierarchy: Admin > Store > Factory
roles := map[domainAuth.Role]int{
	domainAuth.RoleAdmin:   3,
	domainAuth.RoleStore:   2,
	domainAuth.RoleFactory: 1,
}

NEW:
// Role Hierarchy: Admin > DataEntryOperator
roles := map[domainAuth.Role]int{
	domainAuth.RoleAdmin:             2,
	domainAuth.RoleDataEntryOperator: 1,
}

Rationale: Simplified 2-tier hierarchy. Admin has full access; Data Entry Operator has restricted access.
```

#### Migration: `003_rename_roles.up.sql` (NEW)

```sql
-- Migrate existing role values to new naming
UPDATE users SET role = 'DataEntryOperator' WHERE role IN ('Store', 'Factory', 'EntryOperator');
```

### 4.2 Documentation Changes

#### `docs/PRD.md`

```
Section: Authentication & Authorization (L150-153)

OLD:
- Roles (Admin, Storekeeper, Worker) are tied to **User Accounts**, not Machines.
- _Example:_ Admin can log in solely on a Factory Client PC and access full Admin features.

NEW:
- Roles (Admin, Data Entry Operator) are tied to **User Accounts**, not Machines.
- _Example:_ Admin can log in on any Client PC and access full Admin features.

---

Section: RBAC (L241-244)

OLD:
- _Admin/Owner:_ Full Access + Valuation Reports.
- _Storekeeper:_ GRN Entry + Dispatch Entry (No value visibility).
- _Production Manager:_ Recipe Access + Batch Entry.

NEW:
- _Admin/Owner:_ Full Access + Valuation Reports + User Management.
- _Data Entry Operator:_ GRN Entry, Batch Entry, Dispatch Entry (No valuation visibility).

Rationale: Two-role model — Admin sees everything; Data Entry Operator handles all operational data entry without financial visibility.
```

#### `docs/epics.md` — Story 1.4 (L109-122)

```
OLD:
As a System Admin,
I want to create users with specific roles (Admin, Store, Factory),
So that I can control access to sensitive features like stock valuation.
...
- When they create a new user and assign the "Factory" role
- Then that user can access Production screens but CANNOT access "Stock Value" reports

NEW:
As a System Admin,
I want to create users with specific roles (Admin, Data Entry Operator),
So that I can control access to sensitive features like stock valuation.
...
- When they create a new user and assign the "Data Entry Operator" role
- Then that user can access operational screens but CANNOT access "Stock Value" reports
```

#### `docs/tech-spec-epic-1.md` — Roles SQL & APIs

```
OLD (L71):
name TEXT UNIQUE NOT NULL, -- Admin, Store, Factory

NEW:
name TEXT UNIQUE NOT NULL, -- Admin, DataEntryOperator
```

---

## 5. Implementation Handoff

**Change Scope: Minor** — Direct implementation by development team.

### Handoff Plan

| Responsibility             | Agent/Role | Action                                         |
| :------------------------- | :--------- | :--------------------------------------------- |
| **Create follow-up story** | SM (Bob)   | Draft Story 1.4.1 or amend Story 1.4           |
| **Implement code changes** | Dev Agent  | Update 4 Go files + 3 test files + 1 migration |
| **Update documentation**   | SM or Dev  | Update 5 doc files with new role terminology   |
| **Verify**                 | SM         | Code review after implementation               |

### Success Criteria

1. All code references use `Admin` / `DataEntryOperator`
2. All documentation references use `Admin` / `Data Entry Operator`
3. Existing database records are migrated via new migration script
4. All existing tests pass with new role names
5. RBAC middleware correctly enforces 2-tier hierarchy

---

_Sprint Change Proposal generated by Bob (SM) for darko on 2026-02-13._
