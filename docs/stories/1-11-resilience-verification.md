# Story 1.11: Resilience Verification Suite

Status: ready-for-dev

## Story

As a QA Tester,
I want a set of verification tests for these resilience features,
so that we can prove the system is robust and meets the audit requirements.

## Acceptance Criteria

1.  **WAL Recovery Test**: An integration test that starts a server, performs writes, kills the process (SIGKILL), restarts it, and verifies (via SQLite query) that the data is consistent and the WAL file was processed. [Source: docs/resilience-audit-report.md#1.2]
2.  **UDP Re-Discovery Test**: An integration test where the Client is connected to a mock Server; the mock Server is stopped and restarted on a _different_ port/IP (simulating IP change); the Client must auto-reconnect within 5 seconds via the new UDP broadcast. [Source: docs/resilience-audit-report.md#3.2]
3.  **Network Failure Simulation**: A manual test protocol document describing how to disconnect the LAN cable, verify the "Reconnecting" overlay, and verify auto-recovery upon reconnection. [Source: docs/resilience-audit-report.md#3.3]
4.  **Client Reboot Recovery**: A manual test protocol describing how to reboot the Client PC while a draft is open, wait for auto-start, and verify the "Resume Draft" prompt appears. [Source: docs/resilience-audit-report.md#2.3]
5.  **Clock Tamper Test**: An automated test that sets the system clock back by 1 day and asserts that the Server refuses to start/authenticates failure (using the encrypted heartbeat logic from Story 1.3). [Source: docs/resilience-audit-report.md#5.2]

## Tasks / Subtasks

- [ ] Task 1: Implement WAL Recovery Integration Test (AC: 1)
    - [ ] Create `test/integration/resilience_test.go`.
    - [ ] Use `exec.Command` to spawn server process.
    - [ ] Send HTTP POST to create `Item`.
    - [ ] `process.Kill()` (SIGKILL).
    - [ ] Restart server.
    - [ ] Send HTTP GET to verify `Item` exists.

- [ ] Task 2: Implement UDP Re-Discovery Test (AC: 2)
    - [ ] Create mock UDP broadcaster in test (simulating server).
    - [ ] Start Client (or mock client listener).
    - [ ] Change broadcaster Port/IP in payload.
    - [ ] Assert Client updates connection target.

- [ ] Task 3: Create Manual Test Protocols (AC: 3, 4)
    - [ ] Create `docs/test-protocols/resilience-testing.md`.
    - [ ] Document step-by-step for "Pull LAN Cable".
    - [ ] Document step-by-step for "Hard Reboot Client".

- [ ] Task 4: Implement Clock Tamper Test (AC: 5)
    - [ ] If possible, inject "Fake Clock" dependency into License Service.
    - [ ] Configure License Service with `Now + 1 day`.
    - [ ] Call `Validate()`.
    - [ ] Assert `Error: Clock moved backwards` or similar.

## Dev Notes

- **Testing Strategy**:
    - Go Integration Tests (`test/integration`) for backend logic.
    - Manual Protocols for physical/hardware scenarios (cables, reboots).
    - Dependency Injection (`Clock` interface) for time-travel tests to avoid changing system time.
- **Project Structure Notes**:
    - New File: `test/integration/resilience_test.go`
    - New Doc: `docs/test-protocols/resilience-testing.md`

## Learnings from Previous Story

**From Story 1.5 (Automated Local Backup Service)**

- **Integration Testing**: Reuse the `TestMain` and `t.TempDir()` patterns established in Story 1.5 for the WAL Recovery tests. It proved effective for isolating filesystem side effects.
- **Mocking Time**: Story 1.5's scheduler tests highlighted the need for controllable time. For Story 1.11's "Clock Tamper" test, explicitly injecting a `Clock` interface into the License Service is better than modifying system time.

## Dev Agent Record

### Context Reference

- [Story Context](./1-11-resilience-verification.context.xml)

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
