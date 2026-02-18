param(
    [ValidateSet("missing-db", "corrupt-db", "prepare", "all")]
    [string]$Scenario = "missing-db",
    [string]$Remote = "origin",
    [string]$Branch = "",
    [switch]$SkipPull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RecoveryScript = Join-Path $RepoRoot "scripts\windows-recovery-test.ps1"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Test-Path (Join-Path $RepoRoot "wails.json"))) {
    throw "wails.json not found in repo root: $RepoRoot"
}

if (-not (Test-Path $RecoveryScript)) {
    throw "Recovery test script missing: $RecoveryScript"
}

Push-Location $RepoRoot
try {
    if (-not $SkipPull) {
        if ([string]::IsNullOrWhiteSpace($Branch)) {
            $Branch = (& git rev-parse --abbrev-ref HEAD).Trim()
        }

        Write-Step "Pull latest from $Remote/$Branch"
        & git fetch $Remote $Branch
        & git pull --ff-only $Remote $Branch
    }

    Write-Step "Run Windows recovery scenario: $Scenario"
    & powershell -ExecutionPolicy Bypass -File $RecoveryScript -Mode $Scenario
}
finally {
    Pop-Location
}
