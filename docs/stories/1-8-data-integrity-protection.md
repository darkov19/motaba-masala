# Story 1.8: Data Integrity Protection

Status: done

## Story

As a Business Owner,
I want to ensure data is never corrupted by concurrent edits or crashes, and easily recoverable if it is,
so that the inventory numbers are legally reliable and I don't lose my business history.

## Acceptance Criteria

1.  **Optimistic Locking**: Every editable entity (Item, Batch, GRN) has an `updated_at` timestamp. When saving, the server checks if the timestamp matches the one loaded. If it has changed (another user edited it), the save is rejected with: "Record modified by another user. Reload required." [Source: docs/resilience-audit-report.md#4.1]
2.  **Startup Integrity Check**: On server boot, before opening the DB for general access, run `PRAGMA integrity_check`. If it fails, the server should not start in normal mode but instead show an alert to the Admin: "⚠️ Database integrity issue detected. Restore from backup?" with a list of available backups. [Source: docs/resilience-audit-report.md#4.2]
3.  **Missing DB Recovery**: If `masala_inventory.db` is missing on startup, the system checks for backups. If backups exist, it offers: "No database found. Restore from latest backup?". If no backups exist, it initializes a fresh DB (existing behavior). [Source: docs/resilience-audit-report.md#6.1]

## Tasks / Subtasks

- [x] Task 1: Implement Optimistic Locking (AC: 1)
    - [x] Update Domain Entities (`Item`, `Batch`, `GRN`) with `UpdatedAt` field.
    - [x] Update SQL Migrations to add `updated_at` column to relevant tables.
    - [x] Modify `Update` methods in Repositories to use `WHERE id = ? AND updated_at = ?` clause.
    - [x] Check `RowsAffected()`: if 0, return `ErrConcurrencyConflict`.
    - [x] Handle `ErrConcurrencyConflict` in Service layer to return friendly error message.

- [x] Task 2: Implement Startup Integrity Check (AC: 2)
    - [x] Create `IntegrityService` (or add to `DatabaseManager`).
    - [x] Execute `PRAGMA integrity_check` on connection open.
    - [x] If check fails, switch Application State to `RecoveryMode`.
    - [x] Block normal API access in standard middleware if in `RecoveryMode`.

- [x] Task 3: Implement Missing DB Recovery (AC: 3)
    - [x] In `cmd/server/main.go`, check if DB file exists before initializing `DatabaseManager`.
    - [x] If missing, check `backups/` directory for `.zip` files.
    - [x] If backups exist, enter `RecoveryMode` and prompt user via Wails/Admin UI to restore.
    - [x] If no backups, proceed with fresh initialization (migrations).

- [x] Task 4: UI for Recovery Mode (AC: 2, 3)
    - [x] Create specialized Wails Frontend View for "Database Error / Recovery".
    - [x] Display list of available backups.
    - [x] Implement "Restore Selected Backup" action (triggers unzip and restart).

### Review Follow-ups (AI)

- [x] [AI-Review][Med] Remove plaintext bootstrap password logging and replace with a one-time setup signal that does not expose credentials (AC #3)
- [x] [AI-Review][Med] Add automated startup integration coverage for integrity-check failure transitioning to recovery mode (AC #2)

## Dev Notes

- **Architecture**:
    - `RecoveryMode` is a special application state. It might be easiest to catch this early in `main.go` and launch a simplified Wails app or a specific React route that blocks the sidebar/navigation and only allows Restore.
- **Optimistic Locking**:
    - Ensure the `updated_at` sent from client is the one originally fetched.
    - Frontend needs to handle 409 Conflict responses gracefully (e.g., "Reload" button).
- **Project Structure Notes**:
    - Modified: `internal/infrastructure/db/db_manager.go`
    - Modified: `internal/domain/errors.go` (define `ErrConcurrencyConflict`)

## Learnings from Previous Story

**From Story 1.2 (Database Schema Migration)**

- **Migration Safety**: Use `golang-migrate` for adding the `updated_at` columns. Ensure `down` migrations are tested to prevent locking the DB in a bad state.

**From Story 1.5 (Automated Local Backup Service)**

- **Restoration Logic**: The "Missing DB Recovery" task should directly reuse the `BackupService` interface (specifically `GetStatus` to find backups and a new `Restore` method if not already present) rather than reinventing file scanning logic.

## Dev Agent Record

### Context Reference

- [Story Context](./1-8-data-integrity-protection.context.xml)

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-02-18: Planned optimistic-locking implementation with explicit repository concurrency checks and service-level conflict messaging for Item/Batch/GRN.
- 2026-02-18: Added inventory domain/repository/service plus migration `000003` for Batch/GRN tables and concurrency-focused repository tests.
- 2026-02-18: Added startup integrity check (`PRAGMA integrity_check`) and recovery-mode gating in server bootstrap and auth middleware.
- 2026-02-18: Added backup discovery/restore APIs and recovery UI flow in React with restore-triggered restart path.
- 2026-02-18: Ran full Go regression plus frontend test/build validation; all passing.

### Completion Notes List

- Implemented AC1 optimistic locking across Item, Batch, and GRN with `updated_at` comparison in update `WHERE` clauses and `RowsAffected()==0` mapped to `ErrConcurrencyConflict`.
- Added service-level friendly conflict message exactly as required: `Record modified by another user. Reload required.`
- Implemented AC2 startup integrity check in `DatabaseManager.IntegrityCheck()` and server startup path to enter recovery mode when corruption is detected.
- Implemented AC3 missing DB startup handling: if DB is missing and backups exist, server enters recovery mode; if no backups exist, it continues with fresh DB initialization.
- Implemented recovery-mode UI and backend restore action that lists available backups, restores selected zip, and restarts the server process.
- Completed post-review hardening: removed deprecated Ant Design recovery UI usage, added malformed-DB startup recovery integration test, and enabled React Router v7 transition future-flag compatibility in app/test routers.
- Validation results:
- `GOCACHE=/tmp/go-build-cache go test ./...` ✅
- `npm run test:run` (frontend) ✅
- `npm run build` (frontend) ✅

### File List

- cmd/server/main.go
- internal/app/app.go
- internal/app/auth/middleware.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- internal/app/system/recovery_mode.go
- internal/domain/backup/service.go
- internal/domain/errors/errors.go
- internal/domain/inventory/entities.go
- internal/domain/inventory/repository.go
- internal/infrastructure/backup/service.go
- internal/infrastructure/backup/service_test.go
- internal/infrastructure/db/db_manager.go
- internal/infrastructure/db/db_manager_test.go
- internal/infrastructure/db/migrations/000003_add_batches_grns.down.sql
- internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql
- internal/infrastructure/db/migrations_test.go
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- frontend/src/App.tsx
- frontend/src/main.tsx
- frontend/src/__tests__/AppRecoveryMode.test.tsx
- frontend/src/__tests__/AppNavigationBlocker.test.tsx
- docs/sprint-status.yaml

## Change Log

- 2026-02-15: Story drafted.
- 2026-02-18: Implemented optimistic locking for Item/Batch/GRN, startup integrity check + recovery mode, missing DB recovery flow, and recovery UI with backup restore/restart.
- 2026-02-18: Senior Developer Review notes appended.
- 2026-02-18: Senior Developer Review notes appended (follow-up pass).
- 2026-02-20: Addressed review follow-ups, finalized Story 1.8, and prepared sprint tracking for Story 1.9 start.

---

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-18

### Outcome

Blocked

### Summary

Implementation satisfies all acceptance criteria with solid concurrency/recovery evidence, but the story is blocked by high-severity security defaults in server bootstrap.

### Key Findings

#### HIGH Severity

- Hardcoded JWT signing secret in runtime path allows token forgery risk if exposed. [file: `cmd/server/main.go:166`]
- Default bootstrap admin credentials (`admin` / `admin`) create critical first-run compromise risk. [file: `cmd/server/main.go:171`]

#### MEDIUM Severity

- Restore path guard uses prefix string checks instead of canonical relative-path containment (`filepath.Rel`), which is less robust. [file: `internal/infrastructure/backup/service.go:399`]
- Corruption-path startup transition to recovery mode lacks integration-test proof. [file: `cmd/server/main.go:150`]

#### LOW Severity

- Startup ignores backup discovery errors, reducing diagnosability during recovery bootstrapping. [file: `cmd/server/main.go:130`]

### Acceptance Criteria Coverage

| AC# | Description                                                                    | Status      | Evidence                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Optimistic locking with stale-save rejection and friendly conflict message     | IMPLEMENTED | `internal/infrastructure/db/sqlite_inventory_repository.go:49`; `internal/infrastructure/db/sqlite_inventory_repository.go:100`; `internal/infrastructure/db/sqlite_inventory_repository.go:149`; `internal/app/inventory/service.go:10`; `internal/infrastructure/db/sqlite_inventory_repository_test.go:38` |
| AC2 | Startup integrity check and recovery-mode alert/flow                           | IMPLEMENTED | `internal/infrastructure/db/db_manager.go:101`; `cmd/server/main.go:150`; `cmd/server/main.go:152`; `cmd/server/main.go:179`; `internal/app/auth/middleware.go:19`; `frontend/src/App.tsx:205`                                                                                                                |
| AC3 | Missing DB startup recovery with backup restore option and fresh init fallback | IMPLEMENTED | `cmd/server/main.go:135`; `cmd/server/main.go:137`; `cmd/server/main.go:144`; `cmd/server/main.go:160`; `internal/infrastructure/backup/service.go:355`; `frontend/src/App.tsx:232`; `frontend/src/App.tsx:240`                                                                                               |

Summary: 3 of 3 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                                     | Marked As | Verified As       | Evidence                                                                                                                                                                                                                     |
| -------------------------------------------------------- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: Implement Optimistic Locking                     | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:46`                                                                                                                                                               |
| Update entities with `UpdatedAt`                         | [x]       | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:14`; `internal/domain/inventory/entities.go:23`; `internal/domain/inventory/entities.go:33`                                                                                           |
| Add `updated_at` columns in migrations                   | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/migrations/000001_initial_schema.up.sql:31`; `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:7`; `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:18` |
| Repository updates use `WHERE id = ? AND updated_at = ?` | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:51`; `internal/infrastructure/db/sqlite_inventory_repository.go:100`; `internal/infrastructure/db/sqlite_inventory_repository.go:149`                             |
| `RowsAffected()==0` maps to concurrency conflict         | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:58`; `internal/infrastructure/db/sqlite_inventory_repository.go:63`; `internal/infrastructure/db/sqlite_inventory_repository.go:160`                              |
| Service maps conflict to required user message           | [x]       | VERIFIED COMPLETE | `internal/app/inventory/service.go:10`; `internal/app/inventory/service.go:22`                                                                                                                                               |
| Task 2: Implement Startup Integrity Check                | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101`; `cmd/server/main.go:150`                                                                                                                                                     |
| Create integrity-check capability in DB layer            | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101`                                                                                                                                                                               |
| Execute `PRAGMA integrity_check` on startup              | [x]       | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:107`; `cmd/server/main.go:150`                                                                                                                                                     |
| Enter recovery mode when check fails                     | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:151`; `cmd/server/main.go:179`                                                                                                                                                                           |
| Block normal API while in recovery mode                  | [x]       | VERIFIED COMPLETE | `internal/app/auth/middleware.go:19`; `internal/app/system/recovery_mode.go:17`                                                                                                                                              |
| Task 3: Implement Missing DB Recovery                    | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:135`; `cmd/server/main.go:137`; `cmd/server/main.go:144`                                                                                                                                                 |
| Check DB existence before DB connect/init flow           | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:135`; `cmd/server/main.go:151`                                                                                                                                                                           |
| If missing, scan backups for archives                    | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:130`; `internal/infrastructure/backup/service.go:371`                                                                                                                                                    |
| If backups exist, enter recovery mode and prompt restore | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:136`; `cmd/server/main.go:137`; `frontend/src/App.tsx:225`                                                                                                                                               |
| If no backups exist, proceed with fresh initialization   | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:144`; `cmd/server/main.go:160`                                                                                                                                                                           |
| Task 4: UI for Recovery Mode                             | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:205`                                                                                                                                                                                                   |
| Create dedicated recovery UI view                        | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:220`                                                                                                                                                                                                   |
| Display available backups                                | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:232`                                                                                                                                                                                                   |
| Restore selected backup action                           | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:240`; `internal/app/app.go:76`; `internal/infrastructure/backup/service.go:380`; `cmd/server/main.go:181`                                                                                              |

Summary: 20 of 20 completed tasks/subtasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Existing coverage:
    - Concurrency conflict repository behavior (`internal/infrastructure/db/sqlite_inventory_repository_test.go:38`)
    - Service conflict-message mapping (`internal/app/inventory/service_test.go:25`)
    - Integrity check happy path (`internal/infrastructure/db/db_manager_test.go:39`)
    - Backup listing/restore behavior (`internal/infrastructure/backup/service_test.go:234`, `internal/infrastructure/backup/service_test.go:256`)
- Gaps:
    - No startup integration test that proves integrity-check failure flips server into recovery mode.
    - No frontend automated test for recovery UI render and restore action flow.

### Architectural Alignment

Aligned with documented data-integrity architecture patterns (optimistic locking and startup integrity-check/recovery flow) in `docs/architecture.md`.

### Security Notes

- High-severity bootstrap/token hardening issues must be addressed before approval:
    - Runtime signing secret is hardcoded (`cmd/server/main.go:166`).
    - Predictable initial admin credentials are created (`cmd/server/main.go:171`).
- Backup restore path constraints exist but should be hardened with canonical path checks (`internal/infrastructure/backup/service.go:399`).

### Best-Practices and References

- SQLite `PRAGMA integrity_check`: https://www.sqlite.org/pragma.html#pragma_integrity_check
- Go `database/sql` Result handling (`RowsAffected`): https://pkg.go.dev/database/sql#Result
- Wails runtime reference: https://wails.io/docs/reference/runtime/intro/

### Action Items

**Code Changes Required:**

- [x] [High] Load JWT signing secret from environment/config and fail fast when unset in non-dev startup [file: `cmd/server/main.go:70`]
- [x] [High] Replace default `admin/admin` bootstrap with secure one-time setup or randomized bootstrap credential flow [file: `cmd/server/main.go:92`]
- [x] [Med] Replace prefix-based restore-path validation with canonical `filepath.Rel` containment checks [file: `internal/infrastructure/backup/service.go:399`]
- [x] [Med] Add integration test for integrity failure -> recovery mode transition [file: `cmd/server/startup_recovery_test.go:13`]
- [x] [Low] Log and surface backup discovery errors during startup [file: `cmd/server/main.go:222`]

**Advisory Notes:**

- Note: Task 3.1 wording aligned to "before DB connect/init flow"; startup flow now validates existence before connection/migration path.

---

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-18

### Outcome

Changes Requested

### Summary

All acceptance criteria are implemented and all completed tasks are verifiably done. Changes are requested for two medium-severity quality/security gaps before marking the story done.

### Key Findings

#### MEDIUM Severity

- Generated bootstrap admin password is logged in plaintext, which can leak privileged credentials via logs. [file: `cmd/server/main.go:106`]
- Startup/recovery transition is implemented but not covered by an integration-style test proving integrity failure drives recovery-mode boot behavior. [file: `cmd/server/main.go:301`]

#### LOW Severity

- Recovery mode UI path has no dedicated frontend test validating backup-list rendering and restore action feedback. [file: `frontend/src/App.tsx:205`]

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Optimistic locking with stale-save rejection and required user message | IMPLEMENTED | `internal/domain/inventory/entities.go:14`; `internal/infrastructure/db/sqlite_inventory_repository.go:49`; `internal/infrastructure/db/sqlite_inventory_repository.go:51`; `internal/infrastructure/db/sqlite_inventory_repository.go:62`; `internal/app/inventory/service.go:10`; `internal/app/inventory/service.go:22`; `internal/infrastructure/db/sqlite_inventory_repository_test.go:38` |
| AC2 | Startup integrity check blocks normal mode and enters recovery flow on corruption | IMPLEMENTED | `internal/infrastructure/db/db_manager.go:101`; `internal/infrastructure/db/db_manager.go:107`; `cmd/server/main.go:301`; `cmd/server/main.go:302`; `cmd/server/main.go:348`; `internal/app/auth/middleware.go:19`; `frontend/src/App.tsx:205` |
| AC3 | Missing DB startup path offers backup restore when backups exist, otherwise initializes fresh DB | IMPLEMENTED | `cmd/server/main.go:281`; `cmd/server/main.go:285`; `cmd/server/main.go:295`; `cmd/server/main.go:313`; `internal/infrastructure/backup/service.go:355`; `internal/infrastructure/backup/service.go:380`; `frontend/src/App.tsx:232`; `frontend/src/App.tsx:240` |

Summary: 3 of 3 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Task 1: Implement Optimistic Locking | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:46`; `internal/app/inventory/service.go:20` |
| Update Domain Entities (`Item`, `Batch`, `GRN`) with `UpdatedAt` field | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:14`; `internal/domain/inventory/entities.go:23`; `internal/domain/inventory/entities.go:33` |
| Update SQL migrations to add `updated_at` columns | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/migrations/000001_initial_schema.up.sql:31`; `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:7`; `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:18` |
| Modify repository `Update` methods with `WHERE id = ? AND updated_at = ?` | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:51`; `internal/infrastructure/db/sqlite_inventory_repository.go:100`; `internal/infrastructure/db/sqlite_inventory_repository.go:149` |
| Return `ErrConcurrencyConflict` when `RowsAffected() == 0` | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:58`; `internal/infrastructure/db/sqlite_inventory_repository.go:62`; `internal/infrastructure/db/sqlite_inventory_repository.go:160`; `internal/domain/errors/errors.go:7` |
| Handle `ErrConcurrencyConflict` in service layer with friendly message | [x] | VERIFIED COMPLETE | `internal/app/inventory/service.go:10`; `internal/app/inventory/service.go:22`; `internal/app/inventory/service_test.go:25` |
| Task 2: Implement Startup Integrity Check | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101`; `cmd/server/main.go:301` |
| Create `IntegrityService` (or add to `DatabaseManager`) | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101` |
| Execute `PRAGMA integrity_check` on connection open | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:107`; `cmd/server/main.go:301` |
| If check fails, switch Application State to `RecoveryMode` | [x] | VERIFIED COMPLETE | `cmd/server/main.go:302`; `cmd/server/main.go:348`; `internal/app/system/recovery_mode.go:13` |
| Block normal API access in middleware if in `RecoveryMode` | [x] | VERIFIED COMPLETE | `internal/app/auth/middleware.go:19`; `internal/app/system/recovery_mode.go:17` |
| Task 3: Implement Missing DB Recovery | [x] | VERIFIED COMPLETE | `cmd/server/main.go:281`; `cmd/server/main.go:285`; `cmd/server/main.go:295` |
| Check DB file existence before init path | [x] | VERIFIED COMPLETE | `cmd/server/main.go:281` |
| If missing, check `backups/` for `.zip` files | [x] | VERIFIED COMPLETE | `cmd/server/main.go:272`; `internal/infrastructure/backup/service.go:371` |
| If backups exist, enter `RecoveryMode` and prompt restore | [x] | VERIFIED COMPLETE | `cmd/server/main.go:286`; `cmd/server/main.go:287`; `frontend/src/App.tsx:225` |
| If no backups exist, initialize fresh DB | [x] | VERIFIED COMPLETE | `cmd/server/main.go:295`; `cmd/server/main.go:313` |
| Task 4: UI for Recovery Mode | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:205`; `frontend/src/App.tsx:220` |
| Create specialized frontend recovery view | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:220` |
| Display list of available backups | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:230`; `frontend/src/App.tsx:232` |
| Implement restore selected backup action (restore + restart) | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:186`; `frontend/src/App.tsx:240`; `internal/app/app.go:76`; `cmd/server/main.go:350`; `internal/infrastructure/backup/service.go:380` |

Summary: 20 of 20 completed tasks/subtasks verified, 0 questionable, 0 falsely marked complete.

### Test Coverage and Gaps

- Verified passing suites:
  - `GOCACHE=/tmp/go-build-cache go test ./...`
  - `npm run test:run`
  - `npm run build`
- Coverage present for repository concurrency conflicts, service conflict messaging, DB integrity check happy path, and backup list/restore flows.
- Gaps:
  - No startup integration test for integrity-check failure -> recovery mode transition.
  - No dedicated frontend recovery-mode render/restore automated test.

### Architectural Alignment

Implementation aligns with `docs/architecture.md` resilience patterns for optimistic locking and startup integrity checks, and matches `docs/resilience-audit-report.md` recommendations for AC 4.1/4.2/6.1.

### Security Notes

- Medium: plaintext logging of generated bootstrap admin password should be removed to avoid credential leakage via operational logs. [file: `cmd/server/main.go:106`]

### Best-Practices and References

- SQLite `PRAGMA integrity_check`: https://www.sqlite.org/pragma.html#pragma_integrity_check
- Go `path/filepath` (`Rel`, `IsLocal`) path-safety semantics: https://pkg.go.dev/path/filepath
- OWASP Logging Cheat Sheet (exclude secrets/passwords from logs): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Wails runtime/bindings reference context: https://wails.io/docs/next/reference/runtime/intro/ and https://wails.io/docs/howdoesitwork

### Action Items

**Code Changes Required:**

- [ ] [Med] Remove plaintext bootstrap password logging and replace with non-secret setup guidance in logs (AC #3) [file: `cmd/server/main.go:106`]
- [ ] [Med] Add startup integration test for integrity-check failure transitioning to recovery mode (AC #2) [file: `cmd/server/main.go:301`]

**Advisory Notes:**

- Note: Add a focused frontend test for recovery-mode list and restore-button behavior in a future hardening pass.
