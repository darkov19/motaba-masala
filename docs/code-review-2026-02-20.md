# Review Type: Ad-Hoc Code Review

## Reviewer

darko

## Date

2026-02-20

## Files Reviewed

- cmd/server/main.go
- cmd/server/startup_recovery_test.go
- internal/app/app.go
- internal/app/auth/middleware.go
- internal/app/inventory/service.go
- internal/app/inventory/service_test.go
- internal/app/system/recovery_mode.go
- internal/domain/errors/errors.go
- internal/domain/inventory/entities.go
- internal/infrastructure/backup/service.go
- internal/infrastructure/backup/service_test.go
- internal/infrastructure/db/db_manager.go
- internal/infrastructure/db/db_manager_test.go
- internal/infrastructure/db/migrations/000001_initial_schema.up.sql
- internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql
- internal/infrastructure/db/migrations/000003_add_batches_grns.down.sql
- internal/infrastructure/db/migrations_test.go
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- frontend/src/App.tsx
- frontend/src/__tests__/AppRecoveryMode.test.tsx

## Review Focus

- General quality and standards
- Requirements compliance (Story 1.8 ACs and completed tasks)
- Security concerns
- Performance issues
- Architecture alignment

## Outcome

Approve

## Summary

Story 1.8 implementation is complete and internally consistent. All acceptance criteria are implemented with direct code evidence, all completed tasks/subtasks are verifiably done, and relevant tests pass for backend and recovery UI path. Only low-severity maintainability items were identified.

## Key Findings

### LOW

- Ant Design v6 deprecation warnings are present in recovery-mode UI components (`Card bordered`, `Space direction`, `Alert message`, `List`) and should be migrated before the next major upgrade. [file: frontend/src/App.tsx:217]
- Recovery-mode boot path test validates transition logic but still uses injected integrity failure rather than corruption fixture at process bootstrap boundary; this is acceptable currently but leaves a small realism gap. [file: cmd/server/startup_recovery_test.go:119]

## Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Optimistic locking with stale-save rejection and friendly conflict message | IMPLEMENTED | `internal/domain/inventory/entities.go:14`, `internal/domain/inventory/entities.go:23`, `internal/domain/inventory/entities.go:33`, `internal/infrastructure/db/sqlite_inventory_repository.go:51`, `internal/infrastructure/db/sqlite_inventory_repository.go:100`, `internal/infrastructure/db/sqlite_inventory_repository.go:149`, `internal/infrastructure/db/sqlite_inventory_repository.go:62`, `internal/app/inventory/service.go:10`, `internal/app/inventory/service.go:22` |
| AC2 | Startup integrity check before normal operation; recovery mode on integrity failure | IMPLEMENTED | `internal/infrastructure/db/db_manager.go:101`, `internal/infrastructure/db/db_manager.go:107`, `cmd/server/main.go:365`, `cmd/server/main.go:370`, `cmd/server/main.go:412`, `internal/app/auth/middleware.go:19`, `frontend/src/App.tsx:205` |
| AC3 | Missing DB startup recovery prompt with backup list; fresh init fallback when no backups | IMPLEMENTED | `cmd/server/main.go:157`, `cmd/server/main.go:161`, `cmd/server/main.go:314`, `cmd/server/main.go:338`, `internal/infrastructure/backup/service.go:355`, `internal/infrastructure/backup/service.go:372`, `frontend/src/App.tsx:232`, `frontend/src/App.tsx:240` |

Summary: 3 of 3 acceptance criteria fully implemented.

## Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Task 1: Implement Optimistic Locking | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:46`, `internal/app/inventory/service.go:20` |
| Update Domain Entities (`Item`, `Batch`, `GRN`) with `UpdatedAt` field | [x] | VERIFIED COMPLETE | `internal/domain/inventory/entities.go:14`, `internal/domain/inventory/entities.go:23`, `internal/domain/inventory/entities.go:33` |
| Update SQL migrations to add `updated_at` column to relevant tables | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/migrations/000001_initial_schema.up.sql:31`, `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:7`, `internal/infrastructure/db/migrations/000003_add_batches_grns.up.sql:18` |
| Modify `Update` methods to use `WHERE id = ? AND updated_at = ?` | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:51`, `internal/infrastructure/db/sqlite_inventory_repository.go:100`, `internal/infrastructure/db/sqlite_inventory_repository.go:149` |
| `RowsAffected()==0` returns concurrency conflict | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/sqlite_inventory_repository.go:58`, `internal/infrastructure/db/sqlite_inventory_repository.go:62`, `internal/infrastructure/db/sqlite_inventory_repository.go:160`, `internal/domain/errors/errors.go:7` |
| Service maps concurrency conflict to user-friendly message | [x] | VERIFIED COMPLETE | `internal/app/inventory/service.go:10`, `internal/app/inventory/service.go:22`, `internal/app/inventory/service_test.go:25` |
| Task 2: Implement Startup Integrity Check | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101`, `cmd/server/main.go:365` |
| Create integrity-check capability in DB manager layer | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:101` |
| Execute `PRAGMA integrity_check` at startup | [x] | VERIFIED COMPLETE | `internal/infrastructure/db/db_manager.go:107`, `cmd/server/main.go:365` |
| If check fails, switch app to `RecoveryMode` | [x] | VERIFIED COMPLETE | `cmd/server/main.go:366`, `cmd/server/main.go:412`, `internal/app/system/recovery_mode.go:13` |
| Block normal API access while in `RecoveryMode` | [x] | VERIFIED COMPLETE | `internal/app/auth/middleware.go:19`, `internal/app/system/recovery_mode.go:17` |
| Task 3: Implement Missing DB Recovery | [x] | VERIFIED COMPLETE | `cmd/server/main.go:157`, `cmd/server/main.go:161`, `cmd/server/main.go:338` |
| Check DB existence before normal DB initialization | [x] | VERIFIED COMPLETE | `cmd/server/main.go:157`, `cmd/server/main.go:347` |
| If missing, check `backups/` for `.zip` files | [x] | VERIFIED COMPLETE | `cmd/server/main.go:329`, `internal/infrastructure/backup/service.go:371` |
| If backups exist, enter `RecoveryMode` and prompt restore | [x] | VERIFIED COMPLETE | `cmd/server/main.go:161`, `cmd/server/main.go:413`, `frontend/src/App.tsx:225` |
| If no backups, proceed with fresh initialization | [x] | VERIFIED COMPLETE | `cmd/server/main.go:157`, `cmd/server/main.go:375` |
| Task 4: UI for Recovery Mode | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:205`, `frontend/src/App.tsx:220` |
| Create specialized recovery view | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:220` |
| Display list of available backups | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:230`, `frontend/src/App.tsx:232` |
| Implement "Restore Selected Backup" action (restore + restart) | [x] | VERIFIED COMPLETE | `frontend/src/App.tsx:186`, `frontend/src/App.tsx:240`, `internal/app/app.go:76`, `cmd/server/main.go:415`, `internal/infrastructure/backup/service.go:380` |

Summary: 20 of 20 completed tasks/subtasks verified, 0 questionable, 0 falsely marked complete.

## Test Coverage and Gaps

- Executed backend test command: `GOCACHE=/tmp/go-build-cache go test ./cmd/server ./internal/app/inventory ./internal/infrastructure/db ./internal/infrastructure/backup` (all pass).
- Executed frontend recovery test command: `npm run test:run -- AppRecoveryMode` in `frontend/` (pass).
- AC mapping:
  - AC1 concurrency repository/service behavior: `internal/infrastructure/db/sqlite_inventory_repository_test.go:38`, `internal/app/inventory/service_test.go:25`
  - AC2 integrity/recovery startup path: `cmd/server/startup_recovery_test.go:88`, `internal/infrastructure/db/db_manager_test.go:39`
  - AC3 restore flow and backup handling: `internal/infrastructure/backup/service_test.go:256`, `internal/infrastructure/backup/service_test.go:380`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:57`
- Gap:
  - No explicit E2E run proving real on-disk DB corruption (`PRAGMA integrity_check != ok`) through `run()` bootstrap; currently covered via focused startup decision tests.

## Architectural Alignment

Implementation aligns with `docs/architecture.md` resilience/data-integrity patterns:
- Optimistic locking with `updated_at` check
- Startup `PRAGMA integrity_check`
- Distinct recovery mode that blocks normal operations and exposes restore path

No layering violations were found in the reviewed files.

## Security Notes

- Restore path containment is correctly enforced with canonical `filepath.Rel` checks before opening archives. [file: `internal/infrastructure/backup/service.go:399`]
- Bootstrap admin password generation uses cryptographic randomness and avoids plaintext password logging in current implementation. [file: `cmd/server/main.go:106`]

## Best-Practices and References

- SQLite `PRAGMA integrity_check`: https://www.sqlite.org/pragma.html#pragma_integrity_check
- Go `database/sql` result handling (`RowsAffected`): https://pkg.go.dev/database/sql#Result
- Go `path/filepath` safety (`Rel`, `IsAbs`): https://pkg.go.dev/path/filepath
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Action Items

### Code Changes Required

- [x] [Low] Migrate deprecated Ant Design props/components in recovery UI to current v6 API to prevent future breakage [file: `frontend/src/App.tsx:217`]
- [x] [Low] Add one corruption-fixture integration test that drives `run()` startup path into recovery mode using a malformed SQLite file [file: `cmd/server/main.go:365`]

### Advisory Notes

- Note: Current AC and task implementation is complete; this review does not require blocking or changes-requested status.
- Note: The two low-severity follow-ups above were implemented on 2026-02-20.
