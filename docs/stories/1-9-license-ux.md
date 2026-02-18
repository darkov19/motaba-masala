# Story 1.9: License & Security UX

Status: ready-for-dev

## Story

As a System Admin,
I want clear, proactive warnings about license expiry and hardware changes,
so that I can resolve issues without sudden production downtime or confusion.

## Acceptance Criteria

1.  **Expiry Warning Banner**: Starting 30 days before license expiry, a persistent banner appears below the header for all users: "⚠️ License expires in X days. Contact support to renew." [Source: docs/resilience-audit-report.md#5.1]
2.  **Grace Period (Read-Only)**: On the expiry date, instead of locking out completely, the system enters "Read-Only Mode" for 7 days. Users can view data and run reports but cannot create new transactions (GRN, Batch, Dispatch). A red banner explains: "License Expired. Read-only mode active for X more days." After 7 days, full lockout. [Source: docs/resilience-audit-report.md#5.1]
3.  **Hardware Change Error**: If the hardware fingerprint (Motherboard/Disk UUID) changes and mismatches the `license.key`, the server refuses to start normally. Instead, it shows a specific error screen: "Hardware ID Mismatch. Application is locked." It MUST display the _new_ Hardware ID and a "Copy ID" button so the customer can send it to support for a new license. [Source: docs/resilience-audit-report.md#5.3]

## Tasks / Subtasks

- [ ] Task 1: Update License Service (AC: 1, 2)
    - [ ] Update `LicenseStatus` enum to include `Expiring`, `GracePeriod`, `Expired`.
    - [ ] Implement expiry check logic:
        - If `Days <= 30` -> `Expiring`.
        - If `Days <= 0` AND `Days > -7` -> `GracePeriod`.
        - If `Days <= -7` -> `Expired`.
    - [ ] Expose `DaysRemaining` in license status API.

- [ ] Task 2: Implement Read-Only Enforcement (AC: 2)
    - [ ] Create middleware/interceptor in domain services.
    - [ ] If `LicenseStatus == GracePeriod`, block all Write/Update/Delete operations with `403 License Expired`.
    - [ ] Allow Read operations.

- [ ] Task 3: Implement Hardware Error Screen (AC: 3)
    - [ ] Update startup license check (`cmd/server/main.go`).
    - [ ] If `HardwareMismatch` error occurs, launch Wails in "Lockout Mode".
    - [ ] Pass the _new_ computed Hardware ID to the frontend.
    - [ ] Create simple HTML/React view for "Hardware Mismatch" with Copy button.

- [ ] Task 4: Frontend Banners (AC: 1, 2)
    - [ ] Update Main Layout to poll/check License Status.
    - [ ] Render Yellow Warning Banner if `Expiring`.
    - [ ] Render Red Error Banner if `GracePeriod` or `Expired`.
    - [ ] Disable "New GRN", "New Batch" buttons in UI if `GracePeriod`.

## Dev Notes

- **Architecture**:
    - Reuse existing License Service (`internal/domain/license`).
    - Frontend needs global License Context to control UI state (disable buttons).
- **Security**:
    - Enforcement must happen at Backend (API) level, not just frontend button hiding.
- **Project Structure Notes**:
    - Modified: `internal/domain/license/service.go`
    - Modified: `internal/app/middleware.go` (if exists, or add checks in service methods)

## Learnings from Previous Story

**From Story 1.3 (Hardware Bound Licensing)**

- **Hardware Fingerprinting**: Reuse the exact `machineid` logic from Story 1.3. Do not create a new fingerprinting method; consistency is key for the check to work.

**From Story 1.4 (Local Authentication & RBAC)**

- **Permission Middleware**: The "Grace Period" blocking logic is essentially a temporary permission revocation. Reuse the `RequireRole` middleware pattern, potentially adding a `RequireActiveLicense` middleware that checks the service status.

## Dev Agent Record

### Context Reference

- [Story Context](./1-9-license-ux.context.xml)

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
