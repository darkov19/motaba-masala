# Windows Validation Checklist (2026-02-19)

Use this during the native Windows test loop for Story 1-7 / 1-8 recovery and resilience fixes.

## Environment

- OS: Windows (PowerShell)
- Repo root: `C:\Users\shast\Code\motaba-masala` (adjust if different)

## Pre-Run

- [ ] Open PowerShell in repo root.
- [ ] Ensure no existing app process:
  - Command: `Get-Process masala_inventory_server -ErrorAction SilentlyContinue`
  - Pass: no running process (or stop it before testing).

## Test 1: Build Artifact Validity

- [ ] Run:
  - `.\scripts\windows-recovery-test.ps1 -Mode build`
- [ ] Pass criteria:
  - Build completes.
  - `build\bin\masala_inventory_server.exe` launches on Windows.
  - No "not a valid application for this OS platform" error.

## Test 2: Fresh Clone Baseline DB Bootstrap

- [ ] Ensure baseline DB is absent:
  - `if (Test-Path .\masala_inventory.db) { Remove-Item .\masala_inventory.db -Force }`
- [ ] Run:
  - `.\scripts\win-smoke.ps1 -Scenario missing-db`
- [ ] Pass criteria:
  - Script does not fail with `Database file not found`.
  - Baseline DB is auto-created when needed.

## Test 3: Missing DB Recovery + Auto Relaunch

- [ ] During `missing-db` scenario, in Recovery UI click **Restore**.
- [ ] Pass criteria:
  - `masala_inventory.db` is restored.
  - App relaunches automatically (no manual restart required).
  - Relaunched app stays running.

## Test 4: Corrupt DB Recovery Path (Critical)

- [ ] Run:
  - `.\scripts\win-smoke.ps1 -Scenario corrupt-db`
- [ ] Pass criteria:
  - App shows recovery UI (does not hard-exit on startup).
  - No startup-only fatal like `failed to apply pragma ... malformed database schema`.
  - Restore succeeds and app relaunches automatically.

## Test 5: Single-Instance / Relaunch Stability

- [ ] Repeat restore flow once more (either scenario).
- [ ] Pass criteria:
  - No relaunch loop.
  - No immediate exit of relaunched instance due to mutex race.
  - Only one active app process after relaunch.

## Test 6: Windows Tray Icon

- [ ] Start app normally.
- [ ] Pass criteria:
  - Tray icon appears.
  - No log noise: `Unable to set icon: The operation completed successfully.`

## Optional Negative Test: Non-Corruption Connect Failure

- [ ] Simulate DB permission/path failure.
- [ ] Pass criteria:
  - App fails startup with explicit DB connection error.
  - App does **not** incorrectly enter recovery mode.

## Cleanup

- [ ] Reset test state:
  - `.\scripts\windows-recovery-test.ps1 -Mode reset`

## Result Log

| Test | Status (Pass/Fail) | Notes |
|---|---|---|
| Build Artifact Validity |  |  |
| Fresh Clone Baseline DB Bootstrap |  |  |
| Missing DB Recovery + Auto Relaunch |  |  |
| Corrupt DB Recovery Path (Critical) |  |  |
| Single-Instance / Relaunch Stability |  |  |
| Windows Tray Icon |  |  |
| Optional Negative Test |  |  |

## Overall Outcome

- [ ] Ready to close Windows validation issues from `windows-validation-issues-2026-02-19.md`
- [ ] Follow-up needed (capture failures + logs/screenshots)

## Known-Good Run Transcript Template

Copy/fill this for each Windows validation run:

```text
Run Date/Time:
Tester:
Machine:
Branch/Commit:

[1] Build Artifact Validity
Command:
Key Output:
Result: Pass/Fail

[2] Fresh Clone Baseline DB Bootstrap
Command:
Key Output:
Result: Pass/Fail

[3] Missing DB Recovery + Auto Relaunch
Command/UI Steps:
Key Output:
Result: Pass/Fail

[4] Corrupt DB Recovery Path (Critical)
Command/UI Steps:
Key Output:
Result: Pass/Fail

[5] Single-Instance / Relaunch Stability
Command/UI Steps:
Key Output:
Result: Pass/Fail

[6] Windows Tray Icon
UI Steps:
Observed:
Result: Pass/Fail

[Optional] Non-Corruption Connect Failure
Setup/Command:
Observed:
Result: Pass/Fail

Final Assessment:
Open Issues:
Artifacts (logs/screenshots paths):
```
