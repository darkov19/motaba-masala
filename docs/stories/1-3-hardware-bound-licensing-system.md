# Story 1.3: Hardware-Bound Licensing System

Status: done

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

- [x] Implement `LicensingService` Infrastructure (AC: 1, 3)
    - [x] Create `internal/infrastructure/license` package
    - [x] Implement HW ID extraction logic for BIOS UUID and Disk Serial [Source: docs/tech-spec-epic-1.md#L51]
    - [x] Integrate Ed25519 signature verification using a hardcoded Public Key
- [x] Implement Security Checks (AC: 2, 4)
    - [x] Implement encrypted heartbeat timestamp logic for clock check
    - [x] Create periodic background task to update heartbeat while app is running
- [x] System Integration (AC: 2, 5)
    - [x] Modify `cmd/server/main.go` to invoke license check within the `run()` loop
    - [x] Implement graceful shutdown fallback on license failure [Source: stories/1-2-database-schema-migration-system.md#L74]
- [x] Verification and Testing
    - [x] Write unit tests for signature validation with valid/invalid signatures
    - [x] Implement mockable HW ID provider for automated testing

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

- [1-3-hardware-bound-licensing-system.context.xml](file:///home/darko/Code/masala_inventory_managment/docs/stories/1-3-hardware-bound-licensing-system.context.xml)

### Agent Model Used

Antigravity

### Debug Log References

- **WSL2 Compatibility**: Discovered that `/sys/class/dmi/id/product_uuid` and disk serials are inaccessible in WSL2.
- **Fix**: Implemented fallback to `/etc/machine-id` and made disk serial optional if machine-id is present.
- **Resilience**: Heartbeat reading updated to handle trailing newlines from manual `echo` commands.

### Completion Notes List

### File List

- `internal/infrastructure/license/fingerprint.go` (Hardware ID extraction)
- `internal/infrastructure/license/crypto.go` (Ed25519 validation)
- `internal/infrastructure/license/heartbeat.go` (Clock check logic)
- `internal/infrastructure/license/license_service.go` (Service orchestration)
- `internal/infrastructure/license/license_test.go` (Unit tests)
- `cmd/server/main.go` (Integration)
- `scripts/gen_license.go` (Development tool)

## Learnings from Previous Story

**From Story 1.2: Database Schema & Migration System (Status: done)**

- **Patterns for Reuse**: The `run()` pattern in `cmd/server/main.go` should be used for centralized error handling and graceful shutdown if the license check fails.
- **Architectural Reference**: Hexagonal Architecture is well-established; ensures the license logic is isolated in `internal/infrastructure/license`.
- **New Files Created**: `internal/infrastructure/db/db_manager.go` uses a helper for Pragmas; a similar pattern can be used for licensing configurations.
- **Warnings**: Ensure that license checks don't block the main thread indefinitely or cause startup timeouts in Wails.

[Source: stories/1-2-database-schema-migration-system.md#Dev-Agent-Record]

## Change Log

- 2026-02-13: Story drafted from Epic 1.
- 2026-02-13: Implemented core infrastructure and system integration.
- 2026-02-13: Added WSL2 compatibility with machine-id fallbacks.
- 2026-02-13: Verified clock tampering and missing license failures. Status moved to `review`.

- 2026-02-13: Story drafted from Epic 1.
- 2026-02-13: Implemented core infrastructure and system integration.
- 2026-02-13: Added WSL2 compatibility with machine-id fallbacks.
- 2026-02-13: Verified clock tampering and missing license failures. Status moved to `review`.
- 2026-02-13: Addressed review findings (Windows support, build tags, ldflags). Status moved to `done`.

## Senior Developer Review (AI)

### Reviewer: darko

### Date: 2026-02-13

### Outcome: Approve

**Justification**: All critical issues from the previous review have been resolved. The implementation now correctly supports both Linux and Windows using build tags and the Strategy pattern. Security concerns regarding the hardcoded public key have been addressed by allowing injection via ldflags. Code quality is high and adheres to the project's architecture.

### Summary

The `LicensingService` is robust and follows the required Hexagonal Architecture. Hardware fingerprinting is now platform-aware, ensuring the application can target the required Windows environment while remaining testable on Linux. Cryptographic verification and clock tampering checks are implemented correctly.

### Key Findings

No significant issues found. Previous findings have been resolved.

### Acceptance Criteria Coverage

| AC# | Description                | Status      | Evidence                                                       |
| :-- | :------------------------- | :---------- | :------------------------------------------------------------- |
| 1   | HW Fingerprinting          | IMPLEMENTED | `fingerprint_linux.go`, `fingerprint_windows.go` w/ build tags |
| 2   | License Validation         | IMPLEMENTED | `license_service.go:29` calls `VerifyLicense`                  |
| 3   | Cryptographic Security     | IMPLEMENTED | `crypto.go` uses `crypto/ed25519`                              |
| 4   | Clock Tampering Protection | IMPLEMENTED | `heartbeat.go` logic correct                                   |
| 5   | Enforcement Logic          | IMPLEMENTED | `cmd/server/main.go` terminates on failure                     |

**Summary**: 5 of 5 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                        | Marked As | Verified As | Evidence                                            |
| :------------------------------------------ | :-------- | :---------- | :-------------------------------------------------- |
| Implement `LicensingService` Infrastructure | [x]       | VERIFIED    | `internal/infrastructure/license` structure correct |
| Implement Security Checks                   | [x]       | VERIFIED    | `heartbeat.go`, `crypto.go`                         |
| System Integration                          | [x]       | VERIFIED    | `cmd/server/main.go` correctly integrates service   |
| Verification and Testing                    | [x]       | VERIFIED    | `license_test.go` and manual testing reported       |

**Summary**: 4 of 4 completed tasks verified.

### Test Coverage and Gaps

- **Unit Tests**: `license_test.go` covers `GetHardwareID` (mocked), `VerifyLicense` (valid/invalid), and `CheckClockTampering`.
- **Integration**: `main.go` integration logic covers the enforcement flow.
- **Gaps**: None critical. Windows-specific commands (`wmic`) are not unit-tested but rely on OS behavior which is acceptable.

### Architectural Alignment

- **Hexagonal Arch**: `infrastructure/license` isolates the hardware specific logic.
- **Portability**: Build tags (`//go:build`) are used correctly for cross-platform support.

### Security Notes

- Public Key is now injectable via `-ldflags`, allowing for key rotation without code changes.
- Ed25519 is used for signing, providing strong security.

### Best-Practices and References

- **Build Tags**: Correct usage of `//go:build` for platform isolation.
- **Interfaces**: `HardwareProvider` interface enables easy mocking and platform switching.

### Action Items

**Code Changes Required:**

(None)

**Advisory Notes:**

- Note: Ensure CI/CD pipeline builds with `-ldflags "-X main.LicensePublicKey=$PROD_KEY"` for release builds.

### Reviewer: darko

### Date: 2026-02-13

### Outcome: Blocked

**Justification**: The implementation is missing critical Windows support (`HardwareProvider` implementation) which is the primary build target defined in the Architecture. The current code only supports Linux, rendering the application unusable on the target platform.

### Summary

The core licensing logic (crypto, heartbeat, service integration) is well-structured and follows the Hexagonal Architecture. However, the hardware fingerprinting implementation is incomplete as it lacks Windows support.

### Key Findings

#### HIGH Severity

- **Task Falsely Marked Complete**: "Implement HW ID extraction logic for BIOS UUID and Disk Serial" is marked complete, but `internal/infrastructure/license/fingerprint.go` only contains `LinuxHardwareProvider`. There is no Windows implementation, despite the architecture specifying Windows as the target.
- **Missing Platform Support**: The application will fail to compile or function on Windows due to reliance on `/sys/class/...` paths and lack of Windows-specific WMI/Win32 calls.

#### MEDIUM Severity

- **Security**: The Public Key is hardcoded in `cmd/server/main.go`. While acceptable for an MVP, this should be moved to a build-time variable or configuration to allow for key rotation.

### Acceptance Criteria Coverage

| AC# | Description                | Status      | Evidence                                                        |
| :-- | :------------------------- | :---------- | :-------------------------------------------------------------- |
| 1   | HW Fingerprinting          | **PARTIAL** | implemented for Linux in `fingerprint.go`, missing for Windows. |
| 2   | License Validation         | IMPLEMENTED | `license_service.go:29`, `cmd/server/main.go:34`                |
| 3   | Cryptographic Security     | IMPLEMENTED | `crypto.go` uses `crypto/ed25519`                               |
| 4   | Clock Tampering Protection | IMPLEMENTED | `heartbeat.go` implements backward clock check                  |
| 5   | Enforcement Logic          | IMPLEMENTED | `cmd/server/main.go` exits on validation failure                |

**Summary**: 4 of 5 ACs fully implemented. AC1 is partial/missing for target platform.

### Task Completion Validation

| Task                                        | Marked As | Verified As | Evidence                             |
| :------------------------------------------ | :-------- | :---------- | :----------------------------------- |
| Implement `LicensingService` Infrastructure | [x]       | **PARTIAL** | Missing Windows implementation       |
| Implement Security Checks                   | [x]       | VERIFIED    | `heartbeat.go`, `license_service.go` |
| System Integration                          | [x]       | VERIFIED    | `cmd/server/main.go`                 |
| Verification and Testing                    | [x]       | VERIFIED    | `license_test.go`                    |

**Summary**: 3 of 4 completed tasks verified. 1 task (Infrastructure) is incomplete for target platform.

### Best-Practices and References

- **Cross-Platform Go**: Use build tags (`//go:build windows`, `//go:build linux`) to separate platform-specific code. [Go Build Constraints](https://pkg.go.dev/cmd/go#hdr-Build_constraints)
- **Windows Hardware ID**: Use `wmic` or syscalls to `kernel32.dll` / `GetVolumeInformationW` for disk serials.

### Action Items

**Code Changes Required:**

- [x] [High] Implement `WindowsHardwareProvider` in `internal/infrastructure/license/fingerprint_windows.go` (AC #1) [file: internal/infrastructure/license/fingerprint.go]
- [x] [High] Rename `fingerprint.go` to `fingerprint_linux.go` and add `//go:build linux` tag (AC #1)
- [x] [High] Define `HardwareProvider` interface in a common file (e.g., `provider.go`) and use build tags to select the correct implementation.

**Advisory Notes:**

- [x] Note: Consider injecting the Public Key via `ldflags` during build instead of hardcoding in `main.go`.
