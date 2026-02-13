# Story 1.2: Database Schema & Migration System

Status: done

## Story

As a Developer,
I want a robust local database setup with a migration strategy,
so that we can reliably store data and handle schema updates on client machines without data loss.

## Acceptance Criteria

1. **Database Manager**: `DatabaseManager` implemented in `internal/infrastructure/db` to handle SQLite connections. [Source: docs/tech-spec-epic-1.md#L50, docs/architecture.md#L54]
2. **Migration Integration**: `golang-migrate` integrated into the application startup flow. [Source: docs/tech-spec-epic-1.md#L103, docs/architecture.md#L33]
3. **Embedded Migrations**: SQL migration files are embedded in the binary and applied automatically on startup. [Source: docs/architecture.md#L93-94]
4. **Initial Schema**: Tables for `users`, `roles`, `items`, and `stock_ledger` created via migrations. [Source: docs/tech-spec-epic-1.md#L153]
5. **Performance Configuration**: SQLite configured in WAL mode for optimized concurrency. [Source: docs/tech-spec-epic-1.md#L119, docs/epics.md#L90]

## Tasks / Subtasks

- [x] Initialize Database Infrastructure (AC: 1, 2)
    - [x] Set up `internal/infrastructure/db` package
    - [x] Implement SQLite connection manager with WAL mode enabled
    - [x] Integrate `golang-migrate` with `sqlite3` driver
- [x] Create Schema Migrations (AC: 3, 4)
    - [x] Create `migrations/` directory and initial `.sql` files
    - [x] Implement `users` and `roles` table schema [Source: docs/tech-spec-epic-1.md#L60-74]
    - [x] Implement `items` table schema [Source: docs/tech-spec-epic-1.md#L79-87]
    - [x] Implement `stock_ledger` table schema
- [x] Integration and Verification (AC: 2, 3, 5)
    - [x] Use `go:embed` to include migrations in the binary
    - [x] Trigger migration check on Server startup in `cmd/server/main.go`
    - [x] Implement basic logging for migration status

## Dev Notes

- **Tooling**: Use `github.com/golang-migrate/migrate/v4`.
- **Concurrency**: `PRAGMA journal_mode=WAL;` is critical for multi-user LAN access.
- **Embedded Files**: Follow the pattern established in `assets.go` for embedding migrations.

### Project Structure Notes

- **Adapter Location**: `internal/infrastructure/db` will house the SQLite implementation.
- **Logic Isolation**: Ensure `internal/domain` remains agnostic of the database implementation via repository interfaces.

### References

- [tech-spec-epic-1.md](file:///home/darko/Code/masala_inventory_managment/docs/tech-spec-epic-1.md)
- [architecture.md](file:///home/darko/Code/masala_inventory_managment/docs/architecture.md)
- [epics.md](file:///home/darko/Code/masala_inventory_managment/docs/epics.md)

## Dev Agent Record

### Context Reference

- [1-2-database-schema-migration-system.context.xml](file:///home/darko/Code/masala_inventory_managment/docs/stories/1-2-database-schema-migration-system.context.xml)

### Agent Model Used

Antigravity

### Debug Log References

- [Walkthrough](file:///home/darko/.gemini/antigravity/brain/74d1848c-0bcc-4413-9e2d-8b6af0eec084/walkthrough.md)

### Completion Notes List

- Implemented SQLite database infrastructure in `internal/infrastructure/db`.
- Integrated `golang-migrate` for automatic schema management on startup.
- Configured SQLite in WAL mode for optimized multi-client access.
- Embedded migration SQL files into the binary using `go:embed`.
- Verified connectivity and migration logic with unit and integration tests.
- Refactored `DatabaseManager` with a flexible Pragma configuration helper.
- Optimized `main.go` using a `run()` pattern for graceful error handling and cleanup.

### File List

- `cmd/server/main.go`
- `internal/infrastructure/db/db_manager.go`
- `internal/infrastructure/db/migrations.go`
- `internal/infrastructure/db/db_manager_test.go`
- `internal/infrastructure/db/migrations_test.go`
- `migrations/000001_initial_schema.up.sql`
- `migrations/000001_initial_schema.down.sql`
- `migration_assets.go`

## Learnings from Previous Story

**From Story 1-1-project-initialization-repo-setup (Status: done)**

- **New Patterns Established**: Hexagonal Architecture with `internal/app`, `internal/domain`, `internal/infrastructure`.
- **New Files**: `assets.go` (root), `cmd/server/main.go`, `cmd/client/main.go`.
- **Architectural Change**: Dual-binary architecture realized via `wails_server.json` and `wails_client.json`.
- **Testing Setup**: Build verified manually; `go:embed` used for frontend assets.
- **Warnings**: Ensure `internal/domain` remains free of Wails or third-party adapter dependencies.

[Source: stories/1-1-project-initialization-repo-setup.md#Dev-Agent-Record]

## Change Log

- 2026-02-13: Story drafted from Epic 1 and Technical Specifications.
- 2026-02-13: Completed implementation of database manager and migration system. Verified locally by user. Marked for review.
- 2026-02-13: Senior Developer Review (AI) completed. All ACs verified. Outcome: **APPROVE**.
- 2026-02-13: Refactored `DatabaseManager` with Pragma helper and optimized `main.go` error handling based on review findings.

## Senior Developer Review (AI)

**Reviewer**: darko
**Date**: 2026-02-13
**Outcome**: **APPROVE**

### Summary

The implementation of the database manager and migration system is excellent. It strictly follows the Hexagonal Architecture pattern, correctly integrates `golang-migrate` with embedded assets, and applies the required SQLite performance optimizations (WAL mode). Following the initial review, the implementation was further enhanced with a flexible pragma configuration system and more robust error propagation in the server entry point.

### Key Findings

- **HIGH**: None.
- **MEDIUM**: None.
- **LOW**:
    - [RESOLVED] `cmd/server/main.go`: Refactored to use `run() error` for graceful error handling and cleanup, replacing `log.Fatalf`.

### Acceptance Criteria Coverage

| AC# | Description                                      | Status      | Evidence                                         |
| :-- | :----------------------------------------------- | :---------- | :----------------------------------------------- |
| 1   | **Database Manager** implementation              | IMPLEMENTED | `internal/infrastructure/db/db_manager.go:14-24` |
| 2   | **Migration Integration** (`golang-migrate`)     | IMPLEMENTED | `internal/infrastructure/db/migrations.go:37-43` |
| 3   | **Embedded Migrations** (`go:embed`)             | IMPLEMENTED | `migration_assets.go:7-8`                        |
| 4   | **Initial Schema** (users, roles, items, ledger) | IMPLEMENTED | `migrations/000001_initial_schema.up.sql:2-45`   |
| 5   | **Performance Configuration** (WAL mode)         | IMPLEMENTED | `internal/infrastructure/db/db_manager.go:54`    |

**Summary**: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                              | Marked As | Verified As | Evidence                                  |
| :------------------------------------------------ | :-------- | :---------- | :---------------------------------------- |
| Set up `internal/infrastructure/db` package       | [x]       | VERIFIED    | Directory and files exist.                |
| Implement SQLite connection manager with WAL mode | [x]       | VERIFIED    | `db_manager.go:27-66`                     |
| Integrate `golang-migrate` with `sqlite3` driver  | [x]       | VERIFIED    | `migrations.go:26-51`                     |
| Create `migrations/` directory and `.sql` files   | [x]       | VERIFIED    | `migrations/000001_initial_schema.up.sql` |
| Implement `users` and `roles` table schema        | [x]       | VERIFIED    | `initial_schema.up.sql:2-20`              |
| Implement `items` table schema                    | [x]       | VERIFIED    | `initial_schema.up.sql:23-33`             |
| Implement `stock_ledger` table schema             | [x]       | VERIFIED    | `initial_schema.up.sql:36-45`             |
| Use `go:embed` for migrations                     | [x]       | VERIFIED    | `migration_assets.go:7-8`                 |
| Trigger migration check on Server startup         | [x]       | VERIFIED    | `cmd/server/main.go:27`                   |
| Implement basic logging for migration status      | [x]       | VERIFIED    | `migrations.go:50`                        |

**Summary**: All completed tasks verified with code evidence.

### Test Coverage and Gaps

- **Unit Tests**: `db_manager_test.go` verifies connection and WAL mode.
- **Integration Tests**: `migrations_test.go` verifies schema creation with embedded assets.

### Architectural Alignment

- **Hexagonal Architecture**: Followed correctly; DB adapters isolated in infrastructure.
- **Dual-Binary Support**: Correctly integrated into server entry point.

### Action Items

**Code Changes Required**:

- [x] [RESOLVED] Implement a `Pragma` configuration helper for future SQLite optimizations. [file: internal/infrastructure/db/db_manager.go]
- [x] [RESOLVED] Refactor server startup to allow graceful cleanup and defer execution on failure. [file: cmd/server/main.go]

**Advisory Notes**:

- Note: The current implementation now provides a solid foundation for further repository development in the domain layer.
