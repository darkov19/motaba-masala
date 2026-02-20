# Story 1.8 Windows Sign-Off (2026-02-20)

This document is the final Windows sign-off checklist/report for Story 1.8 recovery/integrity behavior.

## Scope

- Story 1.7 + 1.8 Windows runtime behavior
- Native Windows startup/recovery/relaunch reliability
- Background/minimize UX consistency

## Current Build Baseline

- Branch: `main`
- App binary: `build\bin\masala_inventory_server.exe`
- Required scripts:
  - `scripts/windows-recovery-test.ps1`
  - `scripts/win-smoke.ps1`
  - `scripts/windows-hard-sync-build-run.ps1`

## Pre-Validation Setup

- [ ] `git pull`
- [ ] GCC available in current shell (`where.exe gcc`)
- [ ] License values set in `.env.development`:
  - `MASALA_LICENSE_PUBLIC_KEY`
  - `MASALA_LICENSE_KEY`
- [ ] Fresh build:
  - `.\scripts\windows-recovery-test.ps1 -Mode build`

## Sign-Off Matrix

| ID | Validation Item | Expected Result | Status (Pass/Fail) | Evidence |
|---|---|---|---|---|
| W1 | Build artifact validity | Final EXE is runnable PE; app launches |  |  |
| W2 | Missing DB scenario | Recovery UI appears; restore succeeds |  |  |
| W3 | Corrupt DB scenario | Recovery UI appears (no startup hard-exit) |  |  |
| W4 | First restore relaunch | Relaunch occurs automatically; normal UI shown |  |  |
| W5 | Relaunch stability | No relaunch loop; no manual restart needed |  |  |
| W6 | Single-instance behavior | Second launch exits/focuses existing instance |  |  |
| W7 | Close button behavior (`X`) | Window hides/backgrounds (does not hard-exit) |  |  |
| W8 | Minimize/background notification | Single friendly notification appears |  |  |
| W9 | Notification duplication | No duplicate PowerShell + app notifications |  |  |
| W10 | Window/tray icon consistency | Titlebar/taskbar/tray icon visible and correct |  |  |
| W11 | Connection indicator UX | Single dot; retry timer only when disconnected |  |  |
| W12 | Quit confirmation modal | Branded in-app modal (not legacy native dialog) |  |  |

## Diagnostic Log Paths

- Relaunch helper:
  - `%TEMP%\masala-relaunch-helper.log`
- Notification diagnostics:
  - `%TEMP%\masala-notification.log`
- Optional app console capture:
  - `.\build\bin\masala_inventory_server.exe *>&1 | Tee-Object app-run.log`

## Execution Commands

```powershell
.\scripts\windows-recovery-test.ps1 -Mode build
.\scripts\win-smoke.ps1 -Scenario missing-db
.\scripts\win-smoke.ps1 -Scenario corrupt-db
```

Optional hard reset/build/run:

```powershell
.\scripts\windows-hard-sync-build-run.ps1
```

## Outcome

- [ ] Story 1.8 Windows validation signed off
- [ ] Follow-up required

### Notes

```
<fill observations, screenshots, console snippets, and any remaining edge cases>
```
