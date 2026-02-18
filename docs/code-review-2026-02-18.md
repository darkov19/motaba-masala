# Ad-Hoc Code Review Report

## Review Type
Ad-Hoc Code Review

## Reviewer
darko

## Date
2026-02-18

## Files Reviewed
- docs/stories/1-8-data-integrity-protection.md
- cmd/server/main.go
- internal/app/app.go
- internal/app/auth/middleware.go
- internal/app/system/recovery_mode.go
- internal/domain/inventory/entities.go
- internal/domain/errors/errors.go
- internal/infrastructure/db/db_manager.go
- internal/infrastructure/db/sqlite_inventory_repository.go
- internal/infrastructure/backup/service.go
- frontend/src/App.tsx
- internal/infrastructure/db/sqlite_inventory_repository_test.go
- internal/infrastructure/backup/service_test.go
- frontend/src/__tests__/AppRecoveryMode.test.tsx

## Review Focus
General quality and requirements compliance (Story 1.8)

## Outcome
Changes Requested

## Summary
Story 1.8 implementation is functionally strong: optimistic locking, startup integrity checking, and missing-DB recovery are all present with supporting tests. Two medium-severity issues remain around recovery-flow hardening and operational safety.

## Key Findings

### MEDIUM
- `RestoreBackup` is callable regardless of system mode, so DB restore/restart can be triggered outside recovery mode.
  - Evidence: `internal/app/app.go:76` (no recovery-mode guard), `cmd/server/main.go:362` (restore handler registered unconditionally).
  - Risk: unnecessary DB overwrite/restart path remains exposed when system is healthy.

- Startup mode selection performs backup discovery before DB integrity check and then discards initial recovery-state errors (`_`), reducing diagnosability and making control flow harder to reason about under faulted startup.
  - Evidence: `cmd/server/main.go:301` (ignored error), `cmd/server/main.go:314` (re-computation with different error path).
  - Risk: degraded operability and harder incident debugging when startup enters recovery unexpectedly.

### LOW
- `cmd/server/main.go` contains a large block of obsolete review/decision commentary mixed into production code.
  - Evidence: `cmd/server/main.go:488` onward.
  - Risk: maintainability and review signal-to-noise degradation.

## Test Coverage and Gaps
- Present:
  - Concurrency conflict behavior: `internal/infrastructure/db/sqlite_inventory_repository_test.go:38`
  - Backup restore path guard + restore behavior: `internal/infrastructure/backup/service_test.go:256`, `internal/infrastructure/backup/service_test.go:305`
  - Recovery UI render/restore flow: `frontend/src/__tests__/AppRecoveryMode.test.tsx:57`
- Gap:
  - No end-to-end startup integration test proving integrity-check failure path produces expected recovery-mode state from `run()` bootstrap.

## Architectural Alignment
Implementation aligns with Epic 1 resilience direction (optimistic locking, integrity-check, recovery mode) in `docs/architecture.md` and Story 1.8 acceptance goals. The restore path should be constrained to explicit recovery mode to stay aligned with “recovery-only” operational intent.

## Security Notes
No direct injection vulnerabilities found in reviewed Story 1.8 code paths. Main residual risk is operational misuse of restore/restart outside recovery context.

## Best-Practices and References
- SQLite integrity check: https://www.sqlite.org/pragma.html#pragma_integrity_check
- Go `filepath.Rel` path containment pattern: https://pkg.go.dev/path/filepath#Rel
- OWASP logging guidance (avoid sensitive or ambiguous operational logs): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Action Items

### Code Changes Required
- [ ] [Med] Enforce recovery-mode gate in backend restore entrypoint; reject `RestoreBackup` unless recovery mode is enabled. [file: `internal/app/app.go:76`, `cmd/server/main.go:362`]
- [ ] [Med] Stop discarding startup recovery-state errors and normalize one deterministic startup decision path with explicit logging branches. [file: `cmd/server/main.go:301`, `cmd/server/main.go:314`]

### Advisory Notes
- Note: Remove long historical commentary block from `cmd/server/main.go` and keep rationale in PR/story docs instead.
