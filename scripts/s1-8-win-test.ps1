param(
    [ValidateSet("all", "auto", "reset")]
    [string]$Mode = "all",
    [string]$ServerPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DbPath = Join-Path $RepoRoot "masala_inventory.db"
$BackupDir = Join-Path $RepoRoot "backups"
$DefaultServerBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$DefaultServerExe = Join-Path $RepoRoot "server.exe"

if ([string]::IsNullOrWhiteSpace($ServerPath)) {
    if (Test-Path $DefaultServerBuildExe) {
        $ServerPath = $DefaultServerBuildExe
    } elseif (Test-Path $DefaultServerExe) {
        $ServerPath = $DefaultServerExe
    }
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-ServerPath {
    if ([string]::IsNullOrWhiteSpace($ServerPath) -or -not (Test-Path $ServerPath)) {
        throw "Server executable not found. Provide -ServerPath or build first."
    }
}

function Stop-AppProcess([System.Diagnostics.Process]$Process, [string]$Label) {
    if ($null -eq $Process) { return }
    if (-not $Process.HasExited) {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 400
        } catch {
            Write-Warning "Failed to stop $Label process $($Process.Id): $($_.Exception.Message)"
        }
    }
}

function Start-AppProcess([string]$Path, [string]$Label, [switch]$AllowImmediateExit) {
    Write-Step "Starting $Label"
    $proc = Start-Process -FilePath $Path -WorkingDirectory $RepoRoot -PassThru
    Start-Sleep -Seconds 4
    if ($proc.HasExited -and -not $AllowImmediateExit) {
        throw "$Label exited immediately. Path: $Path"
    }
    return $proc
}

function Get-UiTextSnapshot([int]$ProcessId = 0) {
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

    $root = [System.Windows.Automation.AutomationElement]::RootElement
    if ($null -eq $root) { return "" }

    $windows = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    $target = $null
    foreach ($window in $windows) {
        if ($ProcessId -gt 0 -and $window.Current.ProcessId -ne $ProcessId) { continue }
        $name = $window.Current.Name
        if ([string]::IsNullOrWhiteSpace($name)) { continue }
        if ($ProcessId -gt 0 -or $name -like "*Masala Inventory*") {
            $target = $window
            break
        }
    }

    if ($null -eq $target) { return "" }

    $names = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($target.Current.Name)) {
        $names.Add($target.Current.Name)
    }

    $desc = $target.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    foreach ($el in $desc) {
        $name = $el.Current.Name
        if (-not [string]::IsNullOrWhiteSpace($name)) {
            $names.Add($name)
        }
    }

    return ($names -join "`n")
}

function Wait-ForAnyUiText([string[]]$Patterns, [int]$TimeoutSeconds, [int]$ProcessId = 0) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $snapshot = Get-UiTextSnapshot -ProcessId $ProcessId
        foreach ($pattern in $Patterns) {
            if ($snapshot -match $pattern) { return $true }
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function With-DbBackup([scriptblock]$Action) {
    $tempDbBackup = Join-Path $env:TEMP ("masala_inventory.db.s1-8-backup-{0}.bak" -f ([guid]::NewGuid().ToString("N")))
    $hadDb = Test-Path $DbPath

    if ($hadDb) { Copy-Item $DbPath $tempDbBackup -Force }

    try {
        & $Action
    }
    finally {
        if (Test-Path $DbPath) {
            Remove-Item -Force $DbPath -ErrorAction SilentlyContinue
        }
        if ($hadDb -and (Test-Path $tempDbBackup)) {
            Copy-Item $tempDbBackup $DbPath -Force
            Remove-Item -Force $tempDbBackup -ErrorAction SilentlyContinue
        }
    }
}

function Run-CorruptionRecoveryScenario {
    Write-Step "Corrupted DB startup scenario"

    With-DbBackup {
        Set-Content -Path $DbPath -Value "not-a-real-sqlite-db" -Encoding UTF8

        $serverProc = $null
        try {
            $serverProc = Start-AppProcess $ServerPath "Server app (corruption scenario)"
            $detected = Wait-ForAnyUiText @(
                "Database Recovery Mode",
                "Database integrity issue detected",
                "Restore from backup"
            ) 25 $serverProc.Id

            if (-not $detected) {
                throw "Recovery mode UI was not detected for corrupted DB scenario."
            }
            Write-Host "PASS: recovery-mode symptom detected for corrupted DB startup." -ForegroundColor Green
        }
        finally {
            Stop-AppProcess $serverProc "Server app (corruption scenario)"
        }
    }
}

function Run-MissingDbRecoveryScenario {
    Write-Step "Missing DB startup scenario"

    if (-not (Test-Path $BackupDir)) {
        Write-Warning "Backups directory missing: $BackupDir. Skipping missing-DB scenario."
        return
    }

    $zipCount = @(Get-ChildItem -Path $BackupDir -Filter *.zip -File -ErrorAction SilentlyContinue).Count
    if ($zipCount -eq 0) {
        Write-Warning "No backup archives found in $BackupDir. Skipping missing-DB scenario."
        return
    }

    With-DbBackup {
        if (Test-Path $DbPath) {
            Remove-Item -Force $DbPath
        }

        $serverProc = $null
        try {
            $serverProc = Start-AppProcess $ServerPath "Server app (missing DB scenario)"
            $detected = Wait-ForAnyUiText @(
                "No database found",
                "Restore from latest backup",
                "Database Recovery Mode"
            ) 25 $serverProc.Id

            if (-not $detected) {
                throw "Missing-DB recovery prompt was not detected."
            }
            Write-Host "PASS: missing-DB recovery symptom detected." -ForegroundColor Green
        }
        finally {
            Stop-AppProcess $serverProc "Server app (missing DB scenario)"
        }
    }
}

function Run-Auto {
    Assert-ServerPath
    Write-Step "Optimistic locking conflict scenario"
    $prevGoCache = $env:GOCACHE
    if ([string]::IsNullOrWhiteSpace($env:GOCACHE)) {
        $env:GOCACHE = Join-Path $env:TEMP "go-build-masala-s1-8"
    }
    & go run ./cmd/story_automation_probe -scenario optimistic-lock
    $env:GOCACHE = $prevGoCache
    if ($LASTEXITCODE -ne 0) {
        throw "Optimistic locking probe failed."
    }
    Write-Host "PASS: optimistic locking conflict message verified." -ForegroundColor Green

    Run-CorruptionRecoveryScenario
    Run-MissingDbRecoveryScenario
}

Push-Location $RepoRoot
try {
    switch ($Mode) {
        "auto" { Run-Auto }
        "all" { Run-Auto }
        "reset" {
            Write-Step "Reset mode"
            Write-Host "No Story 1.8 artifacts to reset." -ForegroundColor DarkGray
        }
        default { throw "Unsupported mode: $Mode" }
    }

    if ($Mode -ne "reset") {
        Write-Step "Done"
        Write-Host "Story 1.8 validation complete." -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
