param(
    [ValidateSet("user-auto", "manual-ui-all", "auto-network", "auto-reboot", "manual-network", "manual-reboot", "reset")]
    [string]$Mode = "user-auto",
    [string]$GoCachePath = "",
    [string]$ReportPath = "",
    [string]$ServerPath = "",
    [string]$ClientPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$target = Join-Path $PSScriptRoot "story-1-11-windows-resilience-test.ps1"
if (-not (Test-Path $target)) {
    throw "Target script not found: $target"
}

function Invoke-Inner([string]$InnerMode) {
    & powershell -ExecutionPolicy Bypass -File $target -Mode $InnerMode -GoCachePath $GoCachePath -ReportPath $ReportPath -ServerPath $ServerPath -ClientPath $ClientPath
    if ($LASTEXITCODE -ne 0) {
        throw "Story 1.11 inner mode '$InnerMode' failed with exit code $LASTEXITCODE"
    }
}

switch ($Mode) {
    "user-auto" {
        Invoke-Inner "auto-network"
        Invoke-Inner "auto-reboot"
    }
    "manual-ui-all" { Invoke-Inner "manual-ui-all" }
    "auto-network" { Invoke-Inner "auto-network" }
    "auto-reboot" { Invoke-Inner "auto-reboot" }
    "manual-network" { Invoke-Inner "manual-network" }
    "manual-reboot" { Invoke-Inner "manual-reboot" }
    "reset" { Invoke-Inner "reset" }
    default {
        throw "Unsupported mode: $Mode"
    }
}
