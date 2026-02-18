param(
    [ValidateSet("build", "prepare", "missing-db", "corrupt-db", "all", "reset")]
    [string]$Mode = "all"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DbPath = Join-Path $RepoRoot "masala_inventory.db"
$BackupsDir = Join-Path $RepoRoot "backups"
$BuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$MissingDbPath = Join-Path $RepoRoot "masala_inventory.db.missing_test"
$PretestDbBackup = Join-Path $RepoRoot "masala_inventory.db.pretest_backup"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-DbExists {
    if (-not (Test-Path $DbPath)) {
        throw "Database file not found: $DbPath"
    }
}

function Ensure-PretestBackup {
    if ((Test-Path $DbPath) -and -not (Test-Path $PretestDbBackup)) {
        Copy-Item $DbPath $PretestDbBackup
        Write-Host "Saved pretest DB backup: $PretestDbBackup"
    }
}

function Ensure-BackupZip {
    Ensure-DbExists
    New-Item -ItemType Directory -Force -Path $BackupsDir | Out-Null

    $Timestamp = Get-Date -Format "yyyy-MM-ddTHHmmss"
    $ZipPath = Join-Path $BackupsDir "backup-$Timestamp.zip"
    $TempDb = Join-Path $env:TEMP "masala_inventory.db"

    Copy-Item $DbPath $TempDb -Force
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }
    Compress-Archive -Path $TempDb -DestinationPath $ZipPath -Force
    Remove-Item $TempDb -Force

    Write-Host "Created backup zip: $ZipPath"
}

function Build-WindowsApp {
    Write-Step "Building Windows package with Wails"
    Push-Location $RepoRoot
    try {
        & wails build -clean -platform windows/amd64
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path $BuildExe)) {
        throw "Expected built executable not found: $BuildExe"
    }
}

function Stop-AppIfRunning {
    $running = Get-Process -Name "masala_inventory_server" -ErrorAction SilentlyContinue
    if ($running) {
        $running | Stop-Process -Force
        Start-Sleep -Seconds 1
    }
}

function Launch-App {
    if (-not (Test-Path $BuildExe)) {
        throw "Executable missing. Run mode 'build' first. Expected: $BuildExe"
    }
    Start-Process -FilePath $BuildExe -WorkingDirectory $RepoRoot | Out-Null
}

function Run-MissingDbScenario {
    Write-Step "Scenario 1: Missing DB with backup available"
    Stop-AppIfRunning
    Ensure-PretestBackup
    Ensure-BackupZip

    if (Test-Path $MissingDbPath) {
        Remove-Item $MissingDbPath -Force
    }
    if (Test-Path $DbPath) {
        Move-Item $DbPath $MissingDbPath
    }

    Launch-App
    Write-Host "App launched. In UI, verify recovery screen and click Restore."
    Read-Host "After restore completes and app relaunches, press Enter to continue"

    if (-not (Test-Path $DbPath)) {
        Write-Warning "DB file was not restored at expected path: $DbPath"
    }
    else {
        Write-Host "Missing DB recovery appears complete (DB file restored)." -ForegroundColor Green
    }
}

function Corrupt-DbFile {
    Ensure-DbExists
    $bytes = [System.IO.File]::ReadAllBytes($DbPath)
    if ($bytes.Length -lt 136) {
        throw "DB file too small to corrupt safely for this test."
    }
    $pattern = [System.Text.Encoding]::ASCII.GetBytes("CORRUPT!")
    for ($i = 0; $i -lt $pattern.Length; $i++) {
        $bytes[128 + $i] = $pattern[$i]
    }
    [System.IO.File]::WriteAllBytes($DbPath, $bytes)
}

function Run-CorruptDbScenario {
    Write-Step "Scenario 2: Corrupted DB integrity check"
    Stop-AppIfRunning
    Ensure-PretestBackup
    Ensure-BackupZip
    Ensure-DbExists

    Corrupt-DbFile
    Launch-App
    Write-Host "App launched. In UI, verify integrity warning and click Restore."
    Read-Host "After restore completes and app relaunches, press Enter to continue"

    if (-not (Test-Path $DbPath)) {
        Write-Warning "DB file missing after restore: $DbPath"
    }
    else {
        Write-Host "Corruption recovery appears complete (DB file present)." -ForegroundColor Green
    }
}

function Reset-TestState {
    Write-Step "Resetting test state"
    Stop-AppIfRunning

    if ((-not (Test-Path $DbPath)) -and (Test-Path $MissingDbPath)) {
        Move-Item $MissingDbPath $DbPath -Force
        Write-Host "Restored DB from missing-test file."
    }

    if (Test-Path $PretestDbBackup) {
        Copy-Item $PretestDbBackup $DbPath -Force
        Write-Host "Restored DB from pretest backup."
    }
}

switch ($Mode) {
    "build" {
        Build-WindowsApp
    }
    "prepare" {
        Stop-AppIfRunning
        Ensure-PretestBackup
        Ensure-BackupZip
    }
    "missing-db" {
        Run-MissingDbScenario
    }
    "corrupt-db" {
        Run-CorruptDbScenario
    }
    "reset" {
        Reset-TestState
    }
    "all" {
        Build-WindowsApp
        Run-MissingDbScenario
        Run-CorruptDbScenario
        Write-Step "Done"
        Write-Host "If needed, run: .\scripts\windows-recovery-test.ps1 -Mode reset"
    }
}
