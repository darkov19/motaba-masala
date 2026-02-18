# Windows Hybrid Loop (WSL Dev + Windows Runtime Validation)

This guide is for teams developing in WSL2 (AI tooling, coding) while validating Wails runtime behavior natively on Windows (restart/mutex/recovery flows).

## Why this loop

- Wails packaged behavior must be verified on native Windows.
- Building/running from `\\wsl$` can fail with Go file-lock errors.
- Git-based sync is faster and safer than repeated full-folder copies.

## Prerequisites

- Repo exists in two places:
    - WSL dev repo: `/home/darko/Code/masala_inventory_managment`
    - Windows test mirror: `C:\Code\masala_inventory_managment`
- Windows has `go`, `wails`, `npm` available in PATH.

## Scripts

- WSL helper: `scripts/wip-sync.sh`
- Windows helper: `scripts/win-smoke.ps1`
- Recovery runner used by smoke script: `scripts/windows-recovery-test.ps1`

## Daily loop

1. In WSL, code normally.
2. In WSL, commit and push quickly:

```bash
scripts/wip-sync.sh -m "wip: <change summary>" -a
```

3. In Windows mirror, pull + run one scenario:

```powershell
cd C:\Code\masala_inventory_managment
.\scripts\win-smoke.ps1 -Scenario missing-db
```

4. Repeat for corruption scenario when relevant:

```powershell
.\scripts\win-smoke.ps1 -Scenario corrupt-db
```

## Smoke script options (Windows)

```powershell
.\scripts\win-smoke.ps1 -Scenario missing-db
.\scripts\win-smoke.ps1 -Scenario corrupt-db
.\scripts\win-smoke.ps1 -Scenario prepare
.\scripts\win-smoke.ps1 -Scenario all
```

Optional flags:

```powershell
.\scripts\win-smoke.ps1 -Scenario missing-db -Remote origin -Branch wip/darko
.\scripts\win-smoke.ps1 -Scenario missing-db -SkipPull
```

## WSL sync helper options

```bash
scripts/wip-sync.sh -m "wip: message" -a
scripts/wip-sync.sh -m "wip: message" --no-push -a
scripts/wip-sync.sh -m "wip: message" -r origin -b wip/darko -a
```

## Notes

- `windows-recovery-test.ps1` includes interactive checkpoints. Follow UI prompts and press Enter in terminal when asked.
- For final validation, run `-Scenario all` before review signoff.
