# Story 1.3: Hardware-Bound Licensing System

Status: drafted

## Story

As a Business Owner,
I want the application to run only on authorized hardware with a valid license file,
so that I can prevent unauthorized copying and enforce subscription limits.

## Acceptance Criteria

1. **HW Fingerprinting**: Application extracts BIOS UUID and Disk Serial to uniquely identify host hardware. [Source: docs/tech-spec-epic-1.md#L51, docs/epics.md#L107]
2. **License Validation**: Blocks startup with a critical error if `license.key` is missing, tampered with, or linked to a different machine. [Source: docs/epics.md#L103-104, docs/tech-spec-epic-1.md#L154]
3. **Cryptographic Security**: License keys must be validated using Ed25519 asymmetric cryptography. [Source: docs/tech-spec-epic-1.md#L28, docs/architecture.md#L34]
4. **Clock Tampering Protection**: System detects backward clock adjustments using an encrypted "heartbeat" timestamp stored on disk. [Source: docs/epics.md#L105, docs/tech-spec-epic-1.md#L131]
5. **Enforcement Logic**: On license failure, the RPC server is disabled, preventing clients from connecting or performing operations. [Source: docs/architecture.md#L131]

## Tasks / Subtasks

- [ ] Implement `LicensingService` Infrastructure (AC: 1, 3)
    - [ ] Create `internal/infrastructure/license` package
    - [ ] Implement HW ID extraction logic for BIOS UUID and Disk Serial [Source: docs/tech-spec-epic-1.md#L51]
    - [ ] Integrate Ed25519 signature verification using a hardcoded Public Key
- [ ] Implement Security Checks (AC: 2, 4)
    - [ ] Implement encrypted heartbeat timestamp logic for clock check
    - [ ] Create periodic background task to update heartbeat while app is running
- [ ] System Integration (AC: 2, 5)
    - [ ] Modify `cmd/server/main.go` to invoke license check within the `run()` loop
    - [ ] Implement graceful shutdown fallback on license failure [Source: stories/1-2-database-schema-migration-system.md#L74]
- [ ] Verification and Testing
    - [ ] Write unit tests for signature validation with valid/invalid signatures
    - [ ] Implement mockable HW ID provider for automated testing

## Dev Notes

- **Fingerprinting Strategy**: Use a combination of BIOS UUID and Disk Serial to manage risks of single-source changes (e.g., OS updates).
- **Crypto**: Use the standard library `crypto/ed25519`.
- **Clock Check**: The heartbeat should be stored in a small, obfuscated/encrypted file (e.g., `.hw_hb`) to prevent easy manual editing.

### Project Structure Notes

- **Adapter Location**: `internal/infrastructure/license` will house the hardware-specific implementations.
- **Service Interface**: Define a `LicensingService` interface in the application or domain layer if needed for better testability.

### References

- [tech-spec-epic-1.md](file:///home/darko/Code/masala_inventory_managment/docs/tech-spec-epic-1.md)
- [architecture.md](file:///home/darko/Code/masala_inventory_managment/docs/architecture.md)
- [epics.md](file:///home/darko/Code/masala_inventory_managment/docs/epics.md)
- [PRD.md](file:///home/darko/Code/masala_inventory_managment/docs/PRD.md)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List

## Learnings from Previous Story

**From Story 1.2: Database Schema & Migration System (Status: done)**

- **Patterns for Reuse**: The `run()` pattern in `cmd/server/main.go` should be used for centralized error handling and graceful shutdown if the license check fails.
- **Architectural Reference**: Hexagonal Architecture is well-established; ensures the license logic is isolated in `internal/infrastructure/license`.
- **New Files Created**: `internal/infrastructure/db/db_manager.go` uses a helper for Pragmas; a similar pattern can be used for licensing configurations.
- **Warnings**: Ensure that license checks don't block the main thread indefinitely or cause startup timeouts in Wails.

[Source: stories/1-2-database-schema-migration-system.md#Dev-Agent-Record]

## Change Log

- 2026-02-13: Story drafted from Epic 1 and Technical Specifications.
