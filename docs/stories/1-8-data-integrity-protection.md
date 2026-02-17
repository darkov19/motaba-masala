# Story 1.8: Data Integrity Protection

Status: ready-for-dev

## Story

As a Business Owner,
I want to ensure data is never corrupted by concurrent edits or crashes, and easily recoverable if it is,
so that the inventory numbers are legally reliable and I don't lose my business history.

## Acceptance Criteria

1.  **Optimistic Locking**: Every editable entity (Item, Batch, GRN) has an `updated_at` timestamp. When saving, the server checks if the timestamp matches the one loaded. If it has changed (another user edited it), the save is rejected with: "Record modified by another user. Reload required." [Source: docs/resilience-audit-report.md#4.1]
2.  **Startup Integrity Check**: On server boot, before opening the DB for general access, run `PRAGMA integrity_check`. If it fails, the server should not start in normal mode but instead show an alert to the Admin: "⚠️ Database integrity issue detected. Restore from backup?" with a list of available backups. [Source: docs/resilience-audit-report.md#4.2]
3.  **Missing DB Recovery**: If `masala_inventory.db` is missing on startup, the system checks for backups. If backups exist, it offers: "No database found. Restore from latest backup?". If no backups exist, it initializes a fresh DB (existing behavior). [Source: docs/resilience-audit-report.md#6.1]

## Tasks / Subtasks

- [ ] Task 1: Implement Optimistic Locking (AC: 1)
    - [ ] Update Domain Entities (`Item`, `Batch`, `GRN`) with `UpdatedAt` field.
    - [ ] Update SQL Migrations to add `updated_at` column to relevant tables.
    - [ ] Modify `Update` methods in Repositories to use `WHERE id = ? AND updated_at = ?` clause.
    - [ ] Check `RowsAffected()`: if 0, return `ErrConcurrencyConflict`.
    - [ ] Handle `ErrConcurrencyConflict` in Service layer to return friendly error message.

- [ ] Task 2: Implement Startup Integrity Check (AC: 2)
    - [ ] Create `IntegrityService` (or add to `DatabaseManager`).
    - [ ] Execute `PRAGMA integrity_check` on connection open.
    - [ ] If check fails, switch Application State to `RecoveryMode`.
    - [ ] Block normal API access in standard middleware if in `RecoveryMode`.

- [ ] Task 3: Implement Missing DB Recovery (AC: 3)
    - [ ] In `cmd/server/main.go`, check if DB file exists before initializing `DatabaseManager`.
    - [ ] If missing, check `backups/` directory for `.zip` files.
    - [ ] If backups exist, enter `RecoveryMode` and prompt user via Wails/Admin UI to restore.
    - [ ] If no backups, proceed with fresh initialization (migrations).

- [ ] Task 4: UI for Recovery Mode (AC: 2, 3)
    - [ ] Create specialized Wails Frontend View for "Database Error / Recovery".
    - [ ] Display list of available backups.
    - [ ] Implement "Restore Selected Backup" action (triggers unzip and restart).

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-02-15: Story drafted.

---

## Senior Developer Review (AI)

### Reviewer

### Date

### Outcome

### Summary

### Key Findings

#### HIGH Severity

#### MEDIUM Severity

#### LOW Severity

### Acceptance Criteria Coverage

### Task Completion Validation

### Test Coverage and Gaps

### Architectural Alignment

### Security Notes

### Best-Practices and References

### Action Items
