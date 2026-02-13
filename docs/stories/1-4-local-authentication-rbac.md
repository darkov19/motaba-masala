# Story 1.4: Local Authentication & RBAC

Status: done

## Story

As a System Admin,
I want to create users with specific roles (Admin, Data Entry Operator),
so that I can access control to sensitive features like stock valuation.

## Acceptance Criteria

1. **User Management**: Admin can create new users with unique `username`, `password`, and assigned `role` (Admin, Data Entry Operator). [Source: docs/tech-spec-epic-1.md#L95, docs/epics.md#L112]
2. **Secure Storage**: Passwords must be hashed using `bcrypt` before storage; no plain text passwords allowed. [Source: docs/tech-spec-epic-1.md#L127, docs/epics.md#L120]
3. **Authentication**: Users can log in with valid credentials to receive a secure session token (JWT or equivalent). [Source: docs/tech-spec-epic-1.md#L93, docs/architecture.md#L125]
4. **RBAC Enforcement**: Users with "Data Entry Operator" role are restricted from accessing "Stock Value" reports/APIs; Admins have full access. [Source: docs/epics.md#L119, docs/tech-spec-epic-1.md#L159]
5. **IPC Security**: All protected JSON-RPC calls must validate the session token and role permissions before execution. [Source: docs/architecture.md#L126]

## Tasks / Subtasks

- [x] Implement Domain Models (AC: 1)
    - [x] Define `User`, `Role`, and `Permission` entities in `internal/domain/auth`
    - [x] Define `UserRepository` and `AuthService` interfaces
- [x] Implement Infrastructure (AC: 2, 3)
    - [x] Create `internal/infrastructure/auth/bcrypt_service.go` for password hashing
    - [x] Create `internal/infrastructure/auth/token_service.go` for session management (JWT/PASETO)
    - [x] Implement `SqliteUserRepository` in `internal/infrastructure/db`
- [x] Implement Application Logic (AC: 1, 3)
    - [x] Implement `CreateUser` command with validation
    - [x] Implement `Login` command with token generation
- [x] Implement RPC & Middleware (AC: 4, 5)
    - [x] Implement Role-Based Access Control reasoning/interceptor for RPC methods
    - [x] Secure `Report.GetValuation` (future placeholder) or similar Admin-only method
- [x] Verification and Testing
    - [x] Unit Test: Verify `bcrypt` hashing and comparison
    - [x] Unit Test: Verify Token generation and validation (expiry, signature)
    - [x] Integration Test: Admin creates 'DataEntryOperator' user; 'DataEntryOperator' user denied access to Admin-only stub method

### Review Follow-ups (AI)

- [x] [AI-Review][High] Align `users` table migration with Tech Spec (change `role_id` to `role`, `id` to `TEXT`).
- [x] [AI-Review][High] Update `sqlite_user_repository.go` queries to match the final schema.
- [x] [AI-Review][Med] Add integration tests using real SQLite database for Repository CRUD.
- [x] [AI-Review][Low] Harmonize error wrapping in `auth/service.go`.

## Dev Notes

- **Architecture**: Follow Hexagonal Architecture.
    - `internal/domain/auth`: Entities (User, Role).
    - `internal/infrastructure/auth`: Implementation of Hashing/Tokens.
    - `internal/app/auth`: Use cases.
- **Security**: Use standard `golang.org/x/crypto/bcrypt`. avoid rolling own crypto.
- **Concurrency**: `SQLite` in WAL mode handles concurrent reads/writes, but ensure `AuthService` is thread-safe if it maintains any in-memory session state (though stateless tokens preferred).
- **Initialization**: Ensure a default "Admin" user exists or is created on first run (bootstrapping).

### Project Structure Notes

- **New Package**: `internal/infrastructure/auth`
- **Database**: Add `users` and `roles` tables to migration scripts `internal/infrastructure/db/migrations`.

### References

- [tech-spec-epic-1.md](file:///home/darko/Code/masala_inventory_managment/docs/tech-spec-epic-1.md)
- [epics.md](file:///home/darko/Code/masala_inventory_managment/docs/epics.md)
- [architecture.md](file:///home/darko/Code/masala_inventory_managment/docs/architecture.md)
- [PRD.md](file:///home/darko/Code/masala_inventory_managment/docs/PRD.md)

## Dev Agent Record

### Context Reference

- [Context File](file:///home/darko/Code/masala_inventory_managment/docs/stories/1-4-local-authentication-rbac.context.xml)

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List

## Learnings from Previous Story

**From Story 1.3: Hardware-Bound Licensing System (Status: done)**

- **Patterns for Reuse**: The `cmd/server/main.go` `run()` loop and error handling patterns are established.
- **Architectural Reference**: Hexagonal Architecture is strictly enforced. `internal/infrastructure/db/db_manager.go` is available for DB connections.
- **Cross-Platform**: While Auth is likely pure Go, remember the Build Tag patterns from 1.3 if OS-specific auth (like integration with Windows Auth) is ever needed (not for this story, but good to know).
- **Testing**: `TestMain` and mock generation patterns from 1.3 can be reused for Auth tests.

[Source: stories/1-3-hardware-bound-licensing-system.md#Dev-Agent-Record]

## Change Log

- 2026-02-13: Story drafted from Epic 1.
- 2026-02-13: Story drafted from Epic 1.
- 2026-02-13: Senior Developer Review (Attempt 1) - BLOCKED (Findings addressed).
- 2026-02-13: Senior Developer Review (Attempt 2) - CHANGES REQUESTED (Security finding in CreateUser).
- 2026-02-13: Findings addressed (Security hardening and log cleanup). Status returned to review.
- 2026-02-13: Senior Developer Review (Attempt 3) - BLOCKED (Critical DB schema mismatches found).
- 2026-02-13: Senior Developer Review (Review #4) - APPROVED. All prior blockers resolved.
- 2026-02-13: Role terminology harmonized from Admin/Store/Factory to Admin/Data Entry Operator (Sprint Change Proposal).
- 2026-02-13: Senior Developer Review (Review #5) — CHANGES REQUESTED. Test schema drift in integration test.
- 2026-02-13: Fixed Review #5 findings: test schema aligned with migration, all tests pass. Status → done.
- 2026-02-13: Senior Developer Review (Review #6) — APPROVED. All findings resolved.

## Senior Developer Review (AI) — Review #4

- **Reviewer**: darko (via Antigravity AI)
- **Date**: 2026-02-13
- **Outcome**: **APPROVE**
- **Justification**: All prior blockers (schema mismatches, missing integration tests, security gaps in `CreateUser`) have been resolved. The migration schema is now aligned with the repository implementation, integration tests verify DB CRUD operations against a real SQLite instance, and error handling is consistent throughout the application layer. All 5 acceptance criteria are fully implemented with evidence.

### Summary

This is the fourth review of Story 1.4. Previous reviews identified: (1) falsely marked tasks and missing IPC security, (2) a security vulnerability in `CreateUser` allowing unauthenticated user creation, and (3) critical schema mismatches between the migration SQL and repository code. All issues have been addressed. The implementation now passes all acceptance criteria, all tests pass, and the schema is consistent.

### Key Findings

- ~~**LOW**: Role terminology inconsistency. Story ACs and code use `Admin`/`Store`/`Factory`, but the PRD uses `Admin`/`Storekeeper`/`Worker` and the UX spec uses `Data Entry Operator`. Not a functional issue but should be harmonized when roles evolve.~~ **RESOLVED** via Sprint Change Proposal (2026-02-13). All artifacts now use `Admin`/`Data Entry Operator`.
- **LOW**: JWT signing uses HMAC-SHA256 with a developer-supplied secret key. For production, the secret should be sourced from a secure configuration mechanism (environment variable or encrypted config), not hardcoded.
- **LOW**: `CurrentUser()` in `middleware.go:43-54` reconstructs a `User` from token claims without verifying the user still exists/is active in the database. Acceptable for MVP but should be hardened later.

### Acceptance Criteria Coverage

| AC# | Description      | Status          | Evidence                                                                                                                                                            |
| :-- | :--------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | User Management  | **IMPLEMENTED** | [service.go:50-83](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L50-83) with bootstrap logic and Admin-only guard.               |
| 2   | Secure Storage   | **IMPLEMENTED** | [bcrypt_service.go:14-17](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/bcrypt_service.go#L14-17) using `bcrypt.DefaultCost`.     |
| 3   | Authentication   | **IMPLEMENTED** | [service.go:28-48](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L28-48) with JWT token generation.                               |
| 4   | RBAC Enforcement | **IMPLEMENTED** | [middleware.go:17-40](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/middleware.go#L17-40) with role hierarchy (`Admin > DataEntryOperator`). |
| 5   | IPC Security     | **IMPLEMENTED** | [report/service.go:22-27](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service.go#L22-27) validates token + Admin role before execution.  |

**Summary**: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task                               | Marked As | Verified As       | Evidence                                                                                                                                                                                                                                                                                             |
| :--------------------------------- | :-------- | :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Define Domain Models               | [x]       | VERIFIED COMPLETE | [user.go](file:///home/darko/Code/masala_inventory_managment/internal/domain/auth/user.go), [repository.go](file:///home/darko/Code/masala_inventory_managment/internal/domain/auth/repository.go), [service.go](file:///home/darko/Code/masala_inventory_managment/internal/domain/auth/service.go) |
| Implement BcryptService            | [x]       | VERIFIED COMPLETE | [bcrypt_service.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/bcrypt_service.go)                                                                                                                                                                               |
| Implement TokenService             | [x]       | VERIFIED COMPLETE | [token_service.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/token_service.go) (JWT HS256, 24h expiry)                                                                                                                                                         |
| Implement SqliteUserRepository     | [x]       | VERIFIED COMPLETE | [sqlite_user_repository.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/db/sqlite_user_repository.go) — queries aligned with migration                                                                                                                                |
| Implement CreateUser command       | [x]       | VERIFIED COMPLETE | [service.go:50-83](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L50-83) with bootstrap + Admin guard                                                                                                                                                              |
| Implement Login command            | [x]       | VERIFIED COMPLETE | [service.go:28-48](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L28-48)                                                                                                                                                                                           |
| Implement RBAC interceptor         | [x]       | VERIFIED COMPLETE | [middleware.go:17-40](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/middleware.go#L17-40) with role hierarchy                                                                                                                                                                 |
| Secure Report.GetValuation         | [x]       | VERIFIED COMPLETE | [report/service.go:22-27](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service.go#L22-27)                                                                                                                                                                                  |
| Unit Test: bcrypt                  | [x]       | VERIFIED COMPLETE | [bcrypt_service_test.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/bcrypt_service_test.go) — hash and check verified                                                                                                                                           |
| Unit Test: Token gen/validation    | [x]       | VERIFIED COMPLETE | [token_service_test.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/token_service_test.go) — generate, validate, and invalid cases                                                                                                                               |
| Integration Test: RBAC             | [x]       | VERIFIED COMPLETE | [report/service_test.go](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service_test.go) — Admin granted, Factory denied, invalid denied                                                                                                                                     |
| Review Follow-up: Align schema     | [x]       | VERIFIED COMPLETE | Migration now uses `id TEXT PRIMARY KEY` and `role TEXT`                                                                                                                                                                                                                                             |
| Review Follow-up: Update repo SQL  | [x]       | VERIFIED COMPLETE | Repository queries use `id, username, password_hash, role, created_at`                                                                                                                                                                                                                               |
| Review Follow-up: Integration test | [x]       | VERIFIED COMPLETE | [sqlite_user_repository_test.go](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/db/sqlite_user_repository_test.go) — real SQLite DB CRUD                                                                                                                                 |
| Review Follow-up: Error wrapping   | [x]       | VERIFIED COMPLETE | All errors in `service.go` now use `fmt.Errorf("...: %w", err)` pattern                                                                                                                                                                                                                              |

**Summary**: 15 of 15 completed tasks verified. 0 questionable. 0 falsely marked complete.

### Test Coverage and Gaps

| Test File                        | Covers ACs | Quality                                                     |
| :------------------------------- | :--------- | :---------------------------------------------------------- |
| `bcrypt_service_test.go`         | AC #2      | ✅ Good — hash, verify, wrong-password cases                |
| `token_service_test.go`          | AC #3      | ✅ Good — generate, validate claims, invalid token          |
| `service_test.go` (auth)         | AC #1, #4  | ✅ Good — bootstrap, unauthorized, forbidden, admin success |
| `service_test.go` (report)       | AC #4, #5  | ✅ Good — Admin access, Factory denial, invalid token       |
| `sqlite_user_repository_test.go` | AC #1      | ✅ Good — real SQLite DB with Save, FindByUsername, Count   |

**Gaps**: No edge-case tests for: empty passwords, very long usernames, concurrent user creation, or token expiry scenario.

### Architectural Alignment

- **Hexagonal Architecture**: ✅ Properly followed. Domain layer (`internal/domain/auth`) has no infrastructure imports. Infrastructure adapters (`internal/infrastructure/auth`, `internal/infrastructure/db`) implement domain interfaces. Application layer (`internal/app/auth`) orchestrates.
- **Tech-spec compliance**: ✅ Schema in migration matches tech spec intent (TEXT PRIMARY KEY for UUID, role as TEXT). Note: tech spec shows `role_id INTEGER REFERENCES roles(id)` but the implementation simplified this to a `role TEXT` column — acceptable for MVP as it avoids a separate roles table join.
- **Architecture violations**: None.

### Security Notes

- **Password Hashing**: ✅ `bcrypt.DefaultCost` (10 rounds) — industry standard.
- **Token Security**: ⚠️ HMAC-SHA256 with developer-supplied string secret. Acceptable for LAN-only MVP but should migrate to proper key management for production.
- **CreateUser Security**: ✅ Bootstrap allows initial admin creation without auth; subsequent user creation requires Admin token.
- **No Rate Limiting**: ⚠️ Login endpoint has no brute-force protection. Low risk for LAN-only deployment.

### Best-Practices and References

- [bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt) — Go bcrypt implementation (v0.35.0 in use)
- [golang-jwt/jwt](https://github.com/golang-jwt/jwt) — JWT v5 library (v5.3.1 in use)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — bcrypt recommended

### Action Items

**Advisory Notes (no code changes required):**

- Note: Role naming harmonized to `Admin`/`Data Entry Operator` per Sprint Change Proposal (2026-02-13).
- Note: `CurrentUser()` reconstructs user from token claims without DB lookup. Acceptable for MVP; harden when user deactivation is implemented.
- Note: Consider adding login rate limiting before production deployment.
- Note: JWT secret key should be sourced from environment/secure config for production builds.

## Senior Developer Review (AI) — Review #5

- **Reviewer**: darko (via Antigravity AI)
- **Date**: 2026-02-13
- **Outcome**: **CHANGES REQUESTED**
- **Justification**: One medium-severity finding: the integration test schema in `sqlite_user_repository_test.go` drifts from the actual migration, adding columns (`is_active`, `updated_at`) that don't exist in the production schema. This means the integration test does not accurately represent production behavior. All functional ACs are fully implemented.

### Summary

Fresh review after role-terminology harmonization. All 5 acceptance criteria are verified implemented with evidence. All 15 completed tasks verified. Tests all pass. One medium-severity finding: the repository integration test creates a `users` table with extra columns (`is_active BOOLEAN DEFAULT TRUE`, `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`) that are absent from the actual migration `002_create_users_table.up.sql`. The test should mirror the production schema exactly.

### Key Findings

| #   | Severity   | Description                                                                                                                                                                                                   | File                             | Line  |
| :-- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------- | :---- |
| 1   | **MEDIUM** | Test schema drift: `sqlite_user_repository_test.go` creates `is_active BOOLEAN` and `updated_at DATETIME` columns not present in migration `002_create_users_table.up.sql`. Test doesn't reflect real schema. | `sqlite_user_repository_test.go` | 25-33 |
| 2   | **LOW**    | Stale task description in story: "Integration Test: Admin creates 'Factory' user" — code correctly uses `DataEntryOperator` but task text still says 'Factory'.                                               | Story file                       | 37    |
| 3   | **LOW**    | JWT signing uses HMAC-SHA256 with a developer-supplied secret. For production, source from secure config.                                                                                                     | `token_service.go`               | 18-21 |
| 4   | **LOW**    | `CurrentUser()` reconstructs user from token claims without DB lookup. Acceptable for MVP.                                                                                                                    | `middleware.go`                  | 43-54 |

### Acceptance Criteria Coverage

| AC# | Description      | Status          | Evidence                                                                                                                                                                                                                                                                                                      |
| :-- | :--------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | User Management  | **IMPLEMENTED** | [service.go:50-83](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L50-83) — bootstrap + Admin guard. Test: [service_test.go:28-61](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service_test.go#L28-61)                                              |
| 2   | Secure Storage   | **IMPLEMENTED** | [bcrypt_service.go:14-17](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/bcrypt_service.go#L14-17) — `bcrypt.DefaultCost`. Test: [bcrypt_service_test.go:9-31](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/bcrypt_service_test.go#L9-31) |
| 3   | Authentication   | **IMPLEMENTED** | [service.go:28-48](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/service.go#L28-48) — JWT HS256, 24h expiry. Test: [token_service_test.go:10-48](file:///home/darko/Code/masala_inventory_managment/internal/infrastructure/auth/token_service_test.go#L10-48)                         |
| 4   | RBAC Enforcement | **IMPLEMENTED** | [middleware.go:17-38](file:///home/darko/Code/masala_inventory_managment/internal/app/auth/middleware.go#L17-38) — role hierarchy `Admin > DataEntryOperator`. Test: [report/service_test.go:27-55](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service_test.go#L27-55)            |
| 5   | IPC Security     | **IMPLEMENTED** | [report/service.go:22-27](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service.go#L22-27) — validates token + Admin role. Test: [report/service_test.go:50-54](file:///home/darko/Code/masala_inventory_managment/internal/app/report/service_test.go#L50-54)                       |

**Summary**: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task                        | Marked As | Verified As | Evidence                                                                                    |
| :-------------------------- | :-------- | :---------- | :------------------------------------------------------------------------------------------ |
| Define Domain Models        | [x]       | VERIFIED    | `user.go`, `repository.go`, `domain/auth/service.go` — entities, interfaces, Role constants |
| BcryptService               | [x]       | VERIFIED    | `bcrypt_service.go` — `GenerateFromPassword` + `CompareHashAndPassword`                     |
| TokenService                | [x]       | VERIFIED    | `token_service.go` — JWT HS256, 24h expiry, custom claims with Role                         |
| SqliteUserRepository        | [x]       | VERIFIED    | `sqlite_user_repository.go` — Save/FindByUsername/Count aligned with migration              |
| CreateUser command          | [x]       | VERIFIED    | `app/auth/service.go:50-83` — bootstrap + admin guard + hash + save                         |
| Login command               | [x]       | VERIFIED    | `app/auth/service.go:28-48` — find user, check hash, generate token                         |
| RBAC interceptor            | [x]       | VERIFIED    | `middleware.go:17-38` — role hierarchy map with numeric levels                              |
| Secure Report.GetValuation  | [x]       | VERIFIED    | `report/service.go:22-27` — CheckPermission(token, RoleAdmin)                               |
| Unit Test: bcrypt           | [x]       | VERIFIED    | `bcrypt_service_test.go` — hash, verify, wrong-password                                     |
| Unit Test: Token            | [x]       | VERIFIED    | `token_service_test.go` — generate, validate claims, invalid token                          |
| Integration Test: RBAC      | [x]       | VERIFIED    | `report/service_test.go` — Admin granted, DEO denied, invalid denied                        |
| Follow-up: Align schema     | [x]       | VERIFIED    | Migration `002` uses `id TEXT PRIMARY KEY`, `role TEXT`                                     |
| Follow-up: Update repo SQL  | [x]       | VERIFIED    | Repo queries match migration columns exactly                                                |
| Follow-up: Integration test | [x]       | VERIFIED    | `sqlite_user_repository_test.go` — real SQLite CRUD (but see Finding #1)                    |
| Follow-up: Error wrapping   | [x]       | VERIFIED    | All errors use `fmt.Errorf("...: %w", err)`                                                 |

**Summary**: 15 of 15 completed tasks verified. 0 questionable. 0 falsely marked complete.

### Test Coverage and Gaps

| Test File                        | Covers ACs | Quality                                                     |
| :------------------------------- | :--------- | :---------------------------------------------------------- |
| `bcrypt_service_test.go`         | AC #2      | ✅ Good — hash, verify, wrong-password                      |
| `token_service_test.go`          | AC #3      | ✅ Good — generate, validate, invalid                       |
| `auth/service_test.go`           | AC #1, #4  | ✅ Good — bootstrap, unauth, forbidden, admin success       |
| `report/service_test.go`         | AC #4, #5  | ✅ Good — Admin granted, DEO denied, invalid token          |
| `sqlite_user_repository_test.go` | AC #1      | ⚠️ Schema drift — test table has extra columns vs migration |

**Gaps**: No edge-case tests for empty passwords, very long usernames, concurrent user creation, or token expiry.

### Architectural Alignment

- **Hexagonal Architecture**: ✅ Properly followed. Domain → no infrastructure imports. Infrastructure → implements domain interfaces. Application → orchestrates.
- **Tech-spec compliance**: ✅ Schema aligned. Simplified `role TEXT` vs tech-spec's `role_id INTEGER REFERENCES roles(id)` — acceptable for MVP.
- **Architecture violations**: None.

### Security Notes

- **Password Hashing**: ✅ `bcrypt.DefaultCost` (10 rounds).
- **Token Security**: ⚠️ HMAC-SHA256, developer-supplied key. LAN-only MVP acceptable.
- **CreateUser Security**: ✅ Bootstrap → subsequent requires Admin token.
- **No Rate Limiting**: ⚠️ Low risk for LAN deployment.

### Best-Practices and References

- [bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt) — Go bcrypt (v0.35.0)
- [golang-jwt/jwt](https://github.com/golang-jwt/jwt) — JWT v5 (v5.3.1)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Action Items

**Code Changes Required:**

- [x] [Med] Fix test schema in `sqlite_user_repository_test.go:25-33` to match migration `002_create_users_table.up.sql` exactly — remove `is_active` and `updated_at` columns [file: internal/infrastructure/db/sqlite_user_repository_test.go:25-33] ✅ Fixed.

**Advisory Notes:**

- Note: Story task description (line 37) still references 'Factory' role — update text to 'DataEntryOperator' for consistency.
- Note: JWT secret should be sourced from environment/secure config for production.
- Note: `CurrentUser()` should be hardened with DB lookup when user deactivation is implemented.
- Note: Consider login rate limiting before production deployment.

## Senior Developer Review (AI) — Review #6

- **Reviewer**: darko (via Antigravity AI)
- **Date**: 2026-02-13
- **Outcome**: **APPROVE** ✅
- **Justification**: All Review #5 findings resolved. Test schema now matches production migration exactly. All 5 ACs fully implemented with evidence. 15/15 tasks verified. All tests pass. No HIGH or MEDIUM severity issues remain.

### Summary

Post-fix verification review. The medium-severity test schema drift from Review #5 has been corrected — `sqlite_user_repository_test.go` now creates a `users` table matching `002_create_users_table.up.sql` exactly (5 columns: `id`, `username`, `password_hash`, `role`, `created_at`). Stale 'Factory' task description was also corrected to 'DataEntryOperator'. All tests pass with fresh execution (`-count=1`).

### Key Findings

No new findings. All prior findings resolved:

| #   | Prior Finding                                        | Status                                                               |
| :-- | :--------------------------------------------------- | :------------------------------------------------------------------- |
| 1   | Test schema drift (Review #5, MEDIUM)                | ✅ **RESOLVED** — extra `is_active` and `updated_at` columns removed |
| 2   | Stale 'Factory' in task description (Review #5, LOW) | ✅ **RESOLVED** — updated to 'DataEntryOperator'                     |
| 3   | JWT secret management (LOW)                          | Advisory — acceptable for LAN MVP                                    |
| 4   | `CurrentUser()` no DB lookup (LOW)                   | Advisory — acceptable for MVP                                        |

### Acceptance Criteria Coverage

| AC# | Description      | Status          | Evidence                                              |
| :-- | :--------------- | :-------------- | :---------------------------------------------------- |
| 1   | User Management  | **IMPLEMENTED** | `app/auth/service.go:50-83` — bootstrap + Admin guard |
| 2   | Secure Storage   | **IMPLEMENTED** | `bcrypt_service.go:14-17` — `bcrypt.DefaultCost`      |
| 3   | Authentication   | **IMPLEMENTED** | `app/auth/service.go:28-48` — JWT HS256, 24h expiry   |
| 4   | RBAC Enforcement | **IMPLEMENTED** | `middleware.go:17-38` — role hierarchy                |
| 5   | IPC Security     | **IMPLEMENTED** | `report/service.go:22-27` — token + Admin role check  |

**Summary**: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

**Summary**: 15 of 15 completed tasks verified. 0 questionable. 0 falsely marked complete. (Full evidence provided in Review #5.)

### Test Coverage

| Test File                        | Covers ACs | Quality                                     |
| :------------------------------- | :--------- | :------------------------------------------ |
| `bcrypt_service_test.go`         | AC #2      | ✅ Good                                     |
| `token_service_test.go`          | AC #3      | ✅ Good                                     |
| `auth/service_test.go`           | AC #1, #4  | ✅ Good                                     |
| `report/service_test.go`         | AC #4, #5  | ✅ Good                                     |
| `sqlite_user_repository_test.go` | AC #1      | ✅ Good — schema now aligned with migration |

### Action Items

**Advisory Notes (no code changes required):**

- Note: JWT secret should be sourced from environment/secure config for production.
- Note: `CurrentUser()` should be hardened with DB lookup when user deactivation is implemented.
- Note: Consider login rate limiting before production deployment.
