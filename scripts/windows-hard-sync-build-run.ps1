param(
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildDir = Join-Path $RepoRoot "build"
$BuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Push-Location $RepoRoot
try {
    Write-Step "Fetch latest from $Remote"
    & git fetch $Remote

    Write-Step "Hard reset to $Remote/$Branch"
    & git reset --hard "$Remote/$Branch"

    Write-Step "Delete build directory"
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }

    Write-Step "Build app"
    & powershell -ExecutionPolicy Bypass -File ".\scripts\windows-recovery-test.ps1" -Mode build

    if (-not (Test-Path $BuildExe)) {
        throw "Build output missing: $BuildExe"
    }

    Write-Step "Run app from build output"
    & $BuildExe
}
finally {
    Pop-Location
}
