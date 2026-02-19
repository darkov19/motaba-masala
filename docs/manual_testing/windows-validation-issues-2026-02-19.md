# Windows Validation Issues Log (2026-02-19)

This document captures issues encountered during native Windows validation for Story 1.8 recovery/integrity flows.

## Environment

- OS: Windows (PowerShell)
- Repo path: `C:\Users\shast\Code\motaba-masala`
- Build/runtime target: `masala_inventory_server.exe`

## Issue 1: `win-smoke missing-db` fails when baseline DB does not exist

- Symptom:
    - `Database file not found: ...\masala_inventory.db`
- Repro:
    - Run `.\scripts\win-smoke.ps1 -Scenario missing-db` on fresh clone.
- Impact:
    - Scenario cannot start.
- Workaround:
    - Start app once to create baseline DB, then rerun.
- Recommended fix:
    - Auto-bootstrap baseline DB in `windows-recovery-test.ps1` when missing.

## Issue 2: Wails build produced non-executable output (`213C` header)

- Symptom:
    - `build\bin\masala_inventory_server.exe` header was `213C` (`!<` archive), not `4D5A` (`MZ`).
    - Launch error: not a valid application for this OS platform.
- Repro:
    - Run `.\scripts\windows-recovery-test.ps1 -Mode build` and inspect header.
- Impact:
    - Built artifact not runnable.
- Workaround:
    - Build with Go + Wails-required tags:
        - `go build -tags "desktop,production" ... .\cmd\server`
- Recommended fix:
    - Update build script to validate PE header and fail early or fallback build path.

## Issue 3: Systray icon error on Windows (non-fatal)

- Symptom:
    - `Unable to set icon: The operation completed successfully.`
- Repro:
    - Start app on Windows with current embedded icon bytes.
- Impact:
    - Noise/error logs; app still runs.
- Workaround:
    - Ignore for now.
- Recommended fix:
    - Use valid `.ico` tray asset or skip `SetIcon` when unsupported.

## Issue 4: Missing-DB restore did not relaunch app automatically

- Symptom:
    - After clicking Restore, app did not relaunch.
- Repro:
    - `missing-db` scenario; restore from recovery UI.
- Impact:
    - Manual restart required to continue validation.
- Workaround:
    - Manually restart `.\build\bin\masala_inventory_server.exe`.
- Suspected root cause:
    - Restart race with single-instance mutex during restore handoff.
- Recommended fix:
    - Adjust restart sequencing to avoid new instance exiting before old instance releases mutex.

## Issue 5: Corrupt-DB scenario exits before showing recovery UI (critical)

- Symptom:
    - App exits with:
    - `database connection failed: failed to apply pragma PRAGMA journal_mode=WAL;: malformed database schema (?)`
- Repro:
    - Run `.\scripts\win-smoke.ps1 -Scenario corrupt-db` then start app.
- Impact:
    - Recovery UI is never shown; AC2 behavior fails in this path.
- Current status:
    - Open bug.
- Recommended fix:
    - In startup flow, treat DB connect/PRAGMA failure on existing DB as recovery-mode candidate (with backup list/prompt) instead of immediate exit.
    - Add integration test for connect-failure -> recovery transition.

## Overall Status

- `missing-db`: Partially passed (restore worked, relaunch unreliable).
- `corrupt-db`: Failed (startup exits before recovery UI).
- Follow-up required: startup recovery hardening and Windows smoke script robustness.
