# Story 1.9: License & Security UX

Status: done

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

- [x] Review Follow-ups (AI)
    - [x] [AI-Review][High] Enforce lockout-state transition continuously for active sessions (post-grace lockout without restart).
    - [x] [AI-Review][High] Apply grace-period write guard across all relevant inventory write/update/delete command paths.
    - [x] [AI-Review][Med] Replace fail-open `active` fallback on license-status fetch failures with a safe degraded state and explicit warning.
    - [x] [AI-Review][Low] Add automated test coverage for grace-period to expired runtime transition lockout activation.

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
- 2026-02-20: Review-fix plan: (1) make lockout checks continuous by polling lockout + deriving lockout on `expired` status, (2) extend backend write guards to create and update inventory transaction paths, (3) switch frontend license-status failure handling to read-only degraded state with explicit warning, (4) add runtime transition test for grace->expired lockout.
- 2026-02-20: Executed review-fix implementation and validation: full Go regression (`GOCACHE=/tmp/go-cache go test ./...`) and frontend suites for license/recovery UX.

### Completion Notes List

- Implemented new license lifecycle model (`active`, `expiring`, `grace-period`, `expired`) with deterministic day-window calculation and backward-compatible parsing for legacy signature-only license files.
- Added app-level license status API and lockout-state API so frontend can poll status and render explicit lockout UX with Hardware ID copy support.
- Updated server startup flow to enter lockout mode for both hardware mismatch and full-expiry (post-grace), instead of fast process exit.
- Added backend write-access enforcement hook and wired inventory write operations (`UpdateItem`, `UpdateBatch`, `UpdateGRN`) to block during grace period with `403`-style error.
- Added frontend persistent license banners, periodic status polling, read-only disablement for transaction actions (`New GRN`, `New Batch`), and disabled submit/reset actions in forms.
- Added `Copy Support Message` action on lockout screens so users can send Hardware ID and issue context directly to support.
- Added/updated automated tests for licensing status logic, app lockout/status APIs, write-guard enforcement, and frontend lockout/banner behavior (including full-expiry lockout rendering).
- ✅ Resolved review finding [High]: Enforced continuous lockout activation by polling lockout state and deriving runtime lockout from polled `expired` license status.
- ✅ Resolved review finding [High]: Extended inventory service grace-period write guards to create paths (`CreateItem`, `CreateBatch`, `CreateGRN`) in addition to update paths.
- ✅ Resolved review finding [Med]: Replaced fail-open frontend fallback with safe degraded read-only license status and explicit warning message.
- ✅ Resolved review finding [Low]: Added automated frontend test for grace-period to full-expiry runtime transition lockout activation.

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
- `docs/stories/1-9-license-ux.md`

## Change Log

- 2026-02-15: Story drafted.
- 2026-02-20: Implemented license status lifecycle, grace-period read-only enforcement, hardware mismatch lockout mode UI, and frontend license banners/polling; added backend/frontend automated tests.
- 2026-02-20: Updated full-expiry handling to lockout UI with Hardware ID and support-message copy flow; updated Windows manual test script expectations.
- 2026-02-24: Extended lockout UX for clock-tamper detection path with explicit tamper lockout messaging and safe actions (retry validation, copy diagnostics, exit) instead of hard process exit.
- 2026-02-20: Senior Developer Review notes appended (Outcome: Blocked).
- 2026-02-20: Addressed code review findings - 4 items resolved (Date: 2026-02-20).
- 2026-02-21: Senior Developer Review notes appended (Outcome: Approve).

---

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-20

### Outcome

Blocked

### Summary

Implementation quality is good overall, but AC2 is only partially complete. Full lockout after the 7-day grace period is not enforced continuously for active sessions, and one completed task overstates enforcement scope.

### Key Findings

#### HIGH Severity

- AC2 full-lockout transition is not continuously enforced in active UI sessions; lockout state is loaded once while only license status is polled. Evidence: `frontend/src/App.tsx:261`, `frontend/src/App.tsx:311`.
- Task marked complete but not fully implemented as written: "block all Write/Update/Delete operations". Evidence found only for inventory update paths. Evidence: `internal/app/inventory/service.go:22`, `internal/app/inventory/service.go:35`, `internal/app/inventory/service.go:48`; task claim at `docs/stories/1-9-license-ux.md:29`.

#### MEDIUM Severity

- License status fetch failures default frontend state to `active`, which can hide warning/read-only states during backend errors. Evidence: `frontend/src/App.tsx:296`.

#### LOW Severity

- Missing automated coverage for grace-period to full-expiry lockout transition without restart.

### Acceptance Criteria Coverage

| AC# | Description                                                       | Status      | Evidence                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Expiry warning banner starts 30 days before expiry                | IMPLEMENTED | `internal/infrastructure/license/status.go:131`, `cmd/server/main.go:371`, `frontend/src/App.tsx:112`, `frontend/src/App.tsx:161`                                                                                                      |
| AC2 | 7-day read-only grace period with banner, then full lockout       | PARTIAL     | Read-only and banner: `cmd/server/main.go:374`, `frontend/src/App.tsx:123`, `frontend/src/App.tsx:175`, `internal/app/inventory/service.go:22`; runtime lockout transition gap: `frontend/src/App.tsx:261`, `frontend/src/App.tsx:311` |
| AC3 | Hardware mismatch lockout screen with new Hardware ID and Copy ID | IMPLEMENTED | `internal/infrastructure/license/license_service.go:82`, `cmd/server/main.go:318`, `cmd/server/main.go:321`, `frontend/src/App.tsx:390`, `frontend/src/App.tsx:425`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:130`             |

Summary: 2 of 3 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                                               | Marked As | Verified As                 | Evidence                                                                                                                                                               |
| ------------------------------------------------------------------ | --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: Update License Service                                     | [x]       | VERIFIED COMPLETE           | `internal/infrastructure/license/status.go:24`, `internal/infrastructure/license/status.go:116`, `internal/infrastructure/license/license_service.go:94`               |
| Update `LicenseStatus` enum (`Expiring`, `GracePeriod`, `Expired`) | [x]       | VERIFIED COMPLETE           | `internal/infrastructure/license/status.go:26`                                                                                                                         |
| Implement expiry check thresholds                                  | [x]       | VERIFIED COMPLETE           | `internal/infrastructure/license/status.go:125`, `internal/infrastructure/license/status.go:128`, `internal/infrastructure/license/status.go:131`                      |
| Expose `DaysRemaining` in license status API                       | [x]       | VERIFIED COMPLETE           | `internal/app/app.go:16`, `internal/app/app.go:115`, `cmd/server/main.go:367`                                                                                          |
| Task 2: Implement Read-Only Enforcement                            | [x]       | PARTIAL                     | `internal/app/licensemode/licensemode.go:25`, `internal/app/inventory/service.go:22`                                                                                   |
| Create middleware/interceptor in domain services                   | [x]       | VERIFIED COMPLETE           | `internal/app/licensemode/licensemode.go:15`, `cmd/server/main.go:381`                                                                                                 |
| **Block all Write/Update/Delete ops in GracePeriod with 403**      | [x]       | **NOT DONE (as specified)** | Guard present only in inventory update methods: `internal/app/inventory/service.go:22`, `internal/app/inventory/service.go:35`, `internal/app/inventory/service.go:48` |
| Allow read operations                                              | [x]       | VERIFIED COMPLETE           | No read-path enforcement introduced; guard is write-oriented in inventory service                                                                                      |
| Task 3: Implement Hardware Error Screen                            | [x]       | VERIFIED COMPLETE           | `cmd/server/main.go:318`, `frontend/src/App.tsx:390`                                                                                                                   |
| Update startup license check                                       | [x]       | VERIFIED COMPLETE           | `cmd/server/main.go:311`                                                                                                                                               |
| Launch lockout mode on hardware mismatch                           | [x]       | VERIFIED COMPLETE           | `cmd/server/main.go:319`                                                                                                                                               |
| Pass computed Hardware ID to frontend                              | [x]       | VERIFIED COMPLETE           | `cmd/server/main.go:321`, `cmd/server/main.go:503`                                                                                                                     |
| Create frontend lockout view with Copy button                      | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:412`, `frontend/src/App.tsx:425`                                                                                                                 |
| Task 4: Frontend Banners                                           | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:111`                                                                                                                                             |
| Poll/check license status                                          | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:311`                                                                                                                                             |
| Render yellow warning banner for `Expiring`                        | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:112`                                                                                                                                             |
| Render red error banner for `GracePeriod`/`Expired`                | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:123`, `frontend/src/App.tsx:135`                                                                                                                 |
| Disable `New GRN` / `New Batch` in grace period                    | [x]       | VERIFIED COMPLETE           | `frontend/src/App.tsx:71`, `frontend/src/App.tsx:179`, `frontend/src/App.tsx:185`                                                                                      |

Summary: 16 of 17 completed items verified, 0 questionable, 1 false completion.

### Test Coverage and Gaps

- Verified passing Go tests: `internal/infrastructure/license`, `internal/app/inventory`, `internal/app`.
- Verified passing frontend tests: `frontend/src/__tests__/AppLicenseStatus.test.tsx`, `frontend/src/__tests__/AppRecoveryMode.test.tsx`.
- Gap: no test proving live transition from grace-period to full lockout without restart.

### Architectural Alignment

- Aligned with backend-first enforcement intent and lockout UX requirements.
- Not fully aligned with task claim for global write/update/delete enforcement scope.

### Security Notes

- Ed25519 verification includes key/signature format and size checks. Evidence: `internal/infrastructure/license/crypto.go:21`.
- Residual risk: incomplete enforcement scope and fail-open frontend fallback on status fetch errors.

### Best-Practices and References

- Wails runtime events/lifecycle: https://wails.io/docs/reference/runtime/events
- Wails runtime context and startup behavior: https://wails.io/docs/v2.9.0/reference/runtime/intro
- React Effect synchronization/cleanup: https://react.dev/learn/synchronizing-with-effects
- Go database query safety: https://go.dev/doc/database/querying
- Go error wrapping (`errors.Is`/`errors.As`): https://go.dev/blog/go1.13-errors

### Action Items

**Code Changes Required:**

- [x] [High] Enforce lockout-state transition continuously (not only once at startup) so post-grace sessions are forced into lockout UI (AC #2) [file: `frontend/src/App.tsx:261`]
- [x] [High] Apply grace-period write guard to all relevant write/update/delete command paths, not only inventory update methods (AC #2) [file: `internal/app/inventory/service.go:22`]
- [x] [Med] Replace fail-open `active` fallback when `GetLicenseStatus` fails with a safe degraded state and explicit warning (AC #2) [file: `frontend/src/App.tsx:296`]
- [x] [Low] Add automated test for grace-period -> expired runtime transition and lockout activation [file: `frontend/src/__tests__/AppRecoveryMode.test.tsx:145`]

**Advisory Notes:**

- Note: Manual scenario script expectations now match lockout UX intent for full expiry and mismatch flows. [file: `scripts/story-1-9-windows-license-ux-test.ps1:194`]

---

## Senior Developer Review (AI)

### Reviewer

darko

### Date

2026-02-21

### Outcome

Approve

### Summary

Re-review confirms previously blocked items are now resolved. All acceptance criteria are implemented with direct evidence, all checked tasks/subtasks are verifiably complete, and targeted backend/frontend tests pass.

### Key Findings

#### HIGH Severity

- None.

#### MEDIUM Severity

- None.

#### LOW Severity

- None.

### Acceptance Criteria Coverage

| AC# | Description                                                           | Status      | Evidence                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Expiry warning banner starts 30 days before expiry                    | IMPLEMENTED | `internal/infrastructure/license/status.go:131`, `cmd/server/main.go:373`, `frontend/src/App.tsx:113`                                                                                                                                                       |
| AC2 | 7-day read-only grace period with banner, then full lockout           | IMPLEMENTED | Read-only + banner: `cmd/server/main.go:375`, `internal/app/inventory/service.go:21`, `frontend/src/App.tsx:124`; runtime lockout transition: `frontend/src/App.tsx:318`, `frontend/src/App.tsx:332`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:190` |
| AC3 | Hardware mismatch lockout screen with new Hardware ID and copy action | IMPLEMENTED | `internal/infrastructure/license/license_service.go:82`, `cmd/server/main.go:318`, `cmd/server/main.go:321`, `frontend/src/App.tsx:402`, `frontend/src/App.tsx:435`                                                                                         |

Summary: 3 of 3 acceptance criteria fully implemented.

### Task Completion Validation

| Task                                                                                                   | Marked As | Verified As       | Evidence                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 1: Update License Service                                                                         | [x]       | VERIFIED COMPLETE | `internal/infrastructure/license/status.go:22`, `internal/infrastructure/license/license_service.go:94`                                                                                                                                                                                                     |
| Update `LicenseStatus` enum to include `Expiring`, `GracePeriod`, `Expired`                            | [x]       | VERIFIED COMPLETE | `internal/infrastructure/license/status.go:26`                                                                                                                                                                                                                                                              |
| Implement expiry check logic thresholds                                                                | [x]       | VERIFIED COMPLETE | `internal/infrastructure/license/status.go:125`, `internal/infrastructure/license/status.go:128`, `internal/infrastructure/license/status.go:131`                                                                                                                                                           |
| Expose `DaysRemaining` in license status API                                                           | [x]       | VERIFIED COMPLETE | `internal/app/app.go:14`, `cmd/server/main.go:367`                                                                                                                                                                                                                                                          |
| Task 2: Implement Read-Only Enforcement                                                                | [x]       | VERIFIED COMPLETE | `internal/app/licensemode/licensemode.go:15`, `cmd/server/main.go:383`                                                                                                                                                                                                                                      |
| Create middleware/interceptor in domain services                                                       | [x]       | VERIFIED COMPLETE | `internal/app/licensemode/licensemode.go:25`, `internal/app/inventory/service.go:22`                                                                                                                                                                                                                        |
| If `LicenseStatus == GracePeriod`, block all Write/Update/Delete operations with `403 License Expired` | [x]       | VERIFIED COMPLETE | Guard enforced on all current inventory write command paths: `internal/app/inventory/service.go:21`, `internal/app/inventory/service.go:31`, `internal/app/inventory/service.go:44`, `internal/app/inventory/service.go:54`, `internal/app/inventory/service.go:67`, `internal/app/inventory/service.go:77` |
| Allow Read operations                                                                                  | [x]       | VERIFIED COMPLETE | No read guards introduced; enforcement is write-only (`RequireWriteAccess`) across mutation commands                                                                                                                                                                                                        |
| Task 3: Implement Hardware Error Screen                                                                | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:318`, `frontend/src/App.tsx:401`                                                                                                                                                                                                                                                        |
| Update startup license check (`cmd/server/main.go`)                                                    | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:316`                                                                                                                                                                                                                                                                                    |
| If `HardwareMismatch` occurs, launch Wails in lockout mode                                             | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:319`, `cmd/server/main.go:505`                                                                                                                                                                                                                                                          |
| Pass new computed Hardware ID to frontend                                                              | [x]       | VERIFIED COMPLETE | `cmd/server/main.go:321`, `cmd/server/main.go:505`                                                                                                                                                                                                                                                          |
| Create lockout view with copy button                                                                   | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:435`, `frontend/src/App.tsx:436`                                                                                                                                                                                                                                                      |
| Task 4: Frontend Banners                                                                               | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:112`                                                                                                                                                                                                                                                                                  |
| Update Main Layout to poll/check License Status                                                        | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:318`, `frontend/src/App.tsx:319`                                                                                                                                                                                                                                                      |
| Render Yellow Warning Banner if `Expiring`                                                             | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:113`                                                                                                                                                                                                                                                                                  |
| Render Red Error Banner if `GracePeriod` or `Expired`                                                  | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:124`, `frontend/src/App.tsx:136`                                                                                                                                                                                                                                                      |
| Disable `New GRN`, `New Batch` buttons in UI if `GracePeriod`                                          | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:72`, `frontend/src/App.tsx:178`, `frontend/src/App.tsx:184`                                                                                                                                                                                                                           |
| Review Follow-ups (AI)                                                                                 | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:318`, `internal/app/inventory/service.go:21`, `frontend/src/App.tsx:231`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:190`                                                                                                                                                       |
| [AI-Review][High] Enforce lockout-state transition continuously for active sessions                    | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:318`, `frontend/src/App.tsx:332`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:190`                                                                                                                                                                                               |
| [AI-Review][High] Apply grace-period write guard across relevant write/update/delete command paths     | [x]       | VERIFIED COMPLETE | `internal/app/inventory/service.go:21`, `internal/domain/inventory/repository.go:3`                                                                                                                                                                                                                         |
| [AI-Review][Med] Replace fail-open fallback with safe degraded warning state                           | [x]       | VERIFIED COMPLETE | `frontend/src/App.tsx:231`, `frontend/src/App.tsx:305`, `frontend/src/__tests__/AppLicenseStatus.test.tsx:60`                                                                                                                                                                                               |
| [AI-Review][Low] Add test for grace-period to expired runtime lockout activation                       | [x]       | VERIFIED COMPLETE | `frontend/src/__tests__/AppRecoveryMode.test.tsx:190`                                                                                                                                                                                                                                                       |

Summary: 23 of 23 completed items verified, 0 questionable, 0 false completions.

### Test Coverage and Gaps

- AC1 covered by status classification unit tests and banner rendering tests. Evidence: `internal/infrastructure/license/status_test.go:35`, `frontend/src/__tests__/AppLicenseStatus.test.tsx:15`.
- AC2 covered by backend write-guard tests and runtime transition lockout test. Evidence: `internal/app/inventory/service_test.go:70`, `internal/app/inventory/service_test.go:85`, `frontend/src/__tests__/AppRecoveryMode.test.tsx:190`.
- AC3 covered by hardware lockout rendering/copy interaction tests. Evidence: `frontend/src/__tests__/AppRecoveryMode.test.tsx:120`.
- Executed verification commands:
    - `GOCACHE=/tmp/go-cache go test ./internal/infrastructure/license ./internal/app ./internal/app/inventory ./cmd/server`
    - `cd frontend && npm run test:run -- src/__tests__/AppLicenseStatus.test.tsx src/__tests__/AppRecoveryMode.test.tsx`

### Architectural Alignment

- Implementation aligns with architecture intent: backend-enforced license write guards and Wails lockout-aware application startup/runtime state handling.
- No architecture constraint violations found against `docs/architecture.md` and `docs/tech-spec-epic-1.md`.

### Security Notes

- License verification remains cryptographically validated with Ed25519 signature and strict key/signature size checks. Evidence: `internal/infrastructure/license/crypto.go:21`, `internal/infrastructure/license/crypto.go:25`.
- Write-access restriction is enforced server-side, reducing reliance on frontend-only controls. Evidence: `cmd/server/main.go:383`, `internal/app/inventory/service.go:22`.

### Best-Practices and References

- Wails runtime/events: https://wails.io/docs/reference/runtime/events
- Wails runtime basics: https://wails.io/docs/reference/runtime/intro
- React effects and synchronization: https://react.dev/learn/synchronizing-with-effects
- Go error handling (`errors.Is`/`errors.As`): https://go.dev/blog/go1.13-errors
- Go database safety patterns: https://go.dev/doc/database/querying

### Action Items

**Code Changes Required:**

- None.

**Advisory Notes:**

- Note: Keep the existing polling cadence (`30s`) under observation in production and tune if UX needs faster lockout propagation.
