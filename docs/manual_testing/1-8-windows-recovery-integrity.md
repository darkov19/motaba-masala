# Story 1.8 Windows Manual Test Guide (Recovery + Integrity)

Use this on a native Windows machine (not WSL runtime) to validate recovery mode behavior end-to-end.

## Scope

- Missing DB startup recovery flow
- Corrupted DB integrity-check recovery flow
- Recovery-only restore guard behavior

## Prerequisites

1. Open PowerShell in:
    - `C:\Code\masala_inventory_managment`
2. Confirm tools in PATH:
    - `go`, `wails`, `npm`
3. Ensure you have a valid `license.key` in repo root.
4. Close any running server process before tests:

```powershell
Get-Process -Name masala_inventory_server -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Test A: Missing DB -> Recovery Screen -> Restore

1. Build app:

```powershell
.\scripts\windows-recovery-test.ps1 -Mode build
```

2. Run missing-db scenario:

```powershell
.\scripts\windows-recovery-test.ps1 -Mode missing-db
```

3. In UI, verify:
    - Recovery screen is shown.
    - Message includes: `No database found. Restore from latest backup?`
    - Backup list is visible.
4. Click `Restore` on a backup.
5. Verify:
    - App restarts automatically.
    - `masala_inventory.db` exists again in repo root.
    - App returns to normal mode (not recovery screen).

Expected result: PASS if restore succeeds and normal mode returns after restart.

## Test B: Corrupted DB -> Integrity Warning -> Restore

1. Run corruption scenario:

```powershell
.\scripts\windows-recovery-test.ps1 -Mode corrupt-db
```

2. In UI, verify:
    - Recovery screen is shown.
    - Message includes: `⚠️ Database integrity issue detected. Restore from backup?`
3. Click `Restore` on a backup.
4. Verify:
    - App restarts automatically.
    - DB file exists and app comes back in normal mode.

Expected result: PASS if corruption path enters recovery and restore recovers startup.

## Test C: Recovery-Only Restore Guard

Goal: verify backend blocks restore calls outside recovery mode.

1. From repo root, run:

```powershell
$env:GOCACHE="C:\Temp\go-build-cache"
go test ./internal/app -run TestRestoreBackup_RequiresRecoveryMode -v
```

2. Verify test passes.

Expected result: PASS if restore is rejected when recovery mode is disabled.

## Full Smoke (Optional)

Run both recovery scenarios in sequence:

```powershell
.\scripts\win-smoke.ps1 -Scenario all -SkipPull
```

## Reset / Cleanup

After tests, restore baseline DB state:

```powershell
.\scripts\windows-recovery-test.ps1 -Mode reset
```

## Sign-off Checklist

- [ ] Missing DB scenario passed
- [ ] Corrupt DB scenario passed
- [ ] Recovery-only restore guard test passed
- [ ] App returns to normal mode after restore
- [ ] No unexpected startup crashes during scenarios
