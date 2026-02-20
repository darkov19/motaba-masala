# Story 1.9: License & Security UX

Status: review

## Story

As a System Admin,
I want clear, proactive warnings about license expiry and hardware changes,
so that I can resolve issues without sudden production downtime or confusion.

## Acceptance Criteria

1.  **Expiry Warning Banner**: Starting 30 days before license expiry, a persistent banner appears below the header for all users: "⚠️ License expires in X days. Contact support to renew." [Source: docs/resilience-audit-report.md#5.1]
2.  **Grace Period (Read-Only)**: On the expiry date, instead of locking out completely, the system enters "Read-Only Mode" for 7 days. Users can view data and run reports but cannot create new transactions (GRN, Batch, Dispatch). A red banner explains: "License Expired. Read-only mode active for X more days." After 7 days, full lockout. [Source: docs/resilience-audit-report.md#5.1]
3.  **Hardware Change Error**: If the hardware fingerprint (Motherboard/Disk UUID) changes and mismatches the `license.key`, the server refuses to start normally. Instead, it shows a specific error screen: "Hardware ID Mismatch. Application is locked." It MUST display the _new_ Hardware ID and a "Copy ID" button so the customer can send it to support for a new license. [Source: docs/resilience-audit-report.md#5.3]

## Tasks / Subtasks

- [x] Task 1: Update License Service (AC: 1, 2)
    - [x] Update `LicenseStatus` enum to include `Expiring`, `GracePeriod`, `Expired`.
    - [x] Implement expiry check logic:
        - If `Days <= 30` -> `Expiring`.
        - If `Days <= 0` AND `Days > -7` -> `GracePeriod`.
        - If `Days <= -7` -> `Expired`.
    - [x] Expose `DaysRemaining` in license status API.

- [x] Task 2: Implement Read-Only Enforcement (AC: 2)
    - [x] Create middleware/interceptor in domain services.
    - [x] If `LicenseStatus == GracePeriod`, block all Write/Update/Delete operations with `403 License Expired`.
    - [x] Allow Read operations.

- [x] Task 3: Implement Hardware Error Screen (AC: 3)
    - [x] Update startup license check (`cmd/server/main.go`).
    - [x] If `HardwareMismatch` error occurs, launch Wails in "Lockout Mode".
    - [x] Pass the _new_ computed Hardware ID to the frontend.
    - [x] Create simple HTML/React view for "Hardware Mismatch" with Copy button.

- [x] Task 4: Frontend Banners (AC: 1, 2)
    - [x] Update Main Layout to poll/check License Status.
    - [x] Render Yellow Warning Banner if `Expiring`.
    - [x] Render Red Error Banner if `GracePeriod` or `Expired`.
    - [x] Disable "New GRN", "New Batch" buttons in UI if `GracePeriod`.

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

- 2026-02-20: Planned implementation by AC order: (1) extend licensing package with explicit status model and expiry parsing while preserving legacy `license.key` signatures, (2) add backend write guard for grace-period read-only enforcement in inventory service, (3) add startup lockout-mode branch for hardware mismatch with frontend-facing lockout payload, (4) add frontend polling/banners/button disable behavior, (5) run full Go + frontend regression tests before marking complete.
- 2026-02-20: Applied follow-up in same story scope to replace full-expiry fast-exit with explicit lockout UI, adding lockout reason metadata and a copyable support message for renewal requests.

### Completion Notes List

- Implemented new license lifecycle model (`active`, `expiring`, `grace-period`, `expired`) with deterministic day-window calculation and backward-compatible parsing for legacy signature-only license files.
- Added app-level license status API and lockout-state API so frontend can poll status and render explicit lockout UX with Hardware ID copy support.
- Updated server startup flow to enter lockout mode for both hardware mismatch and full-expiry (post-grace), instead of fast process exit.
- Added backend write-access enforcement hook and wired inventory write operations (`UpdateItem`, `UpdateBatch`, `UpdateGRN`) to block during grace period with `403`-style error.
- Added frontend persistent license banners, periodic status polling, read-only disablement for transaction actions (`New GRN`, `New Batch`), and disabled submit/reset actions in forms.
- Added `Copy Support Message` action on lockout screens so users can send Hardware ID and issue context directly to support.
- Added/updated automated tests for licensing status logic, app lockout/status APIs, write-guard enforcement, and frontend lockout/banner behavior (including full-expiry lockout rendering).

### File List

- `internal/infrastructure/license/status.go`
- `internal/infrastructure/license/license_service.go`
- `internal/infrastructure/license/crypto.go`
- `internal/infrastructure/license/status_test.go`
- `internal/app/licensemode/licensemode.go`
- `internal/app/inventory/service.go`
- `internal/app/inventory/service_test.go`
- `internal/app/app.go`
- `internal/app/app_test.go`
- `cmd/server/main.go`
- `frontend/src/App.tsx`
- `frontend/src/components/forms/GRNForm.tsx`
- `frontend/src/components/forms/BatchForm.tsx`
- `frontend/src/__tests__/AppRecoveryMode.test.tsx`
- `frontend/src/__tests__/AppLicenseStatus.test.tsx`
- `scripts/story-1-9-windows-license-ux-test.ps1`

## Change Log

- 2026-02-15: Story drafted.
- 2026-02-20: Implemented license status lifecycle, grace-period read-only enforcement, hardware mismatch lockout mode UI, and frontend license banners/polling; added backend/frontend automated tests.
- 2026-02-20: Updated full-expiry handling to lockout UI with Hardware ID and support-message copy flow; updated Windows manual test script expectations.

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
