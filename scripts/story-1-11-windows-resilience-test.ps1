param(
    [ValidateSet("all", "build", "wal", "udp", "clock", "manual-network", "manual-reboot", "reset")]
    [string]$Mode = "all",
    [switch]$Rebuild,
    [switch]$SkipInstallers,
    [string]$GoCachePath = "",
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildScript = Join-Path $RepoRoot "scripts\windows-hard-sync-build-run.ps1"
$ProtocolDoc = Join-Path $RepoRoot "docs\test-protocols\resilience-testing.md"
$ManualTestingDir = Join-Path $RepoRoot "docs\manual_testing"

if ([string]::IsNullOrWhiteSpace($GoCachePath)) {
    $GoCachePath = Join-Path $env:TEMP "go-build-masala-story-1-11"
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $dateTag = Get-Date -Format "yyyy-MM-dd"
    $ReportPath = Join-Path $ManualTestingDir ("story-1-11-resilience-validation-{0}.md" -f $dateTag)
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-PathExists([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) {
        throw "$Label not found: $Path"
    }
}

function Ensure-ReportHeader {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null
    if (Test-Path $ReportPath) {
        return
    }

    $header = @(
        "# Story 1.11 Resilience Validation Report"
        ""
        "- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
        '- Protocol Reference: `docs/test-protocols/resilience-testing.md`'
        '- Script: `scripts/story-1-11-windows-resilience-test.ps1`'
        ""
        "## Results"
        ""
    ) -join "`r`n"
    Set-Content -Path $ReportPath -Value $header -Encoding UTF8
}

function Add-ReportLine([string]$Line) {
    Ensure-ReportHeader
    Add-Content -Path $ReportPath -Value $Line
}

function Invoke-HardSyncBuild {
    Assert-PathExists $BuildScript "Build script"
    Write-Step "Running windows-hard-sync-build-run.ps1"
    Write-Host "WARNING: This does a git hard reset and removes uncommitted changes." -ForegroundColor Yellow
    if ($SkipInstallers) {
        & powershell -ExecutionPolicy Bypass -File $BuildScript -SkipInstallers
    }
    else {
        & powershell -ExecutionPolicy Bypass -File $BuildScript
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Build script failed with exit code $LASTEXITCODE"
    }
}

function Invoke-GoTest([string]$Label, [string]$Package, [string]$RunPattern) {
    Write-Step "Automated check: $Label"
    $env:GOCACHE = $GoCachePath
    & go test $Package -run $RunPattern -count=1
    if ($LASTEXITCODE -ne 0) {
        Add-ReportLine("- [FAIL] $Label")
        throw "Automated check failed: $Label"
    }
    Write-Host "PASS: $Label" -ForegroundColor Green
    Add-ReportLine("- [PASS] $Label")
}

function Run-WalTest {
    Invoke-GoTest "WAL Recovery Integration Test (AC1)" "./test/integration" "TestWALRecoveryIntegration"
}

function Run-UdpTest {
    Invoke-GoTest "UDP Re-Discovery Integration Test (AC2)" "./test/integration" "TestUDPRediscoveryIntegration"
}

function Run-ClockTamperTest {
    Invoke-GoTest "Clock Tamper Test via ValidateLicense (AC5)" "./internal/infrastructure/license" "TestValidateLicense_ClockTamperDetectedWithInjectedClock"
}

function Prompt-ManualChecklist(
    [string]$ScenarioName,
    [string[]]$Checks
) {
    Ensure-ReportHeader
    Write-Step "Manual scenario: $ScenarioName"
    Write-Host "Reference protocol doc: $ProtocolDoc" -ForegroundColor DarkGray
    Write-Host "Run the scenario now, then confirm each check." -ForegroundColor Yellow
    Write-Host ""

    $allPass = $true
    Add-ReportLine("")
    Add-ReportLine("### $ScenarioName")
    foreach ($check in $Checks) {
        $answer = Read-Host "[y/n] $check"
        $passed = $answer.Trim().ToLower() -in @("y", "yes")
        if ($passed) {
            Add-ReportLine("- [PASS] $check")
        }
        else {
            $allPass = $false
            Add-ReportLine("- [FAIL] $check")
        }
    }

    $notes = Read-Host "Optional notes for this scenario (enter to skip)"
    if (-not [string]::IsNullOrWhiteSpace($notes)) {
        Add-ReportLine("- Notes: $notes")
    }

    if ($allPass) {
        Write-Host "PASS: $ScenarioName" -ForegroundColor Green
    }
    else {
        Write-Warning "One or more checks failed in: $ScenarioName"
    }
}

function Run-ManualNetworkScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 1: Network Failure Simulation (Pull LAN Cable) (AC3)" `
        -Checks @(
            "Reconnecting overlay appears after LAN disconnect.",
            "Client reconnects automatically after network restoration.",
            "Recovery is within 5 seconds under stable LAN conditions.",
            "Evidence captured (screenshots + timings)."
        )
}

function Run-ManualRebootScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 2: Client Reboot Recovery (AC4)" `
        -Checks @(
            "Resume draft prompt appears after reboot with unsaved draft.",
            "Choosing Resume restores draft values.",
            "Choosing Discard clears stored draft and opens clean form.",
            "Evidence captured (screenshots + timestamps)."
        )
}

function Run-All {
    Run-WalTest
    Run-UdpTest
    Run-ClockTamperTest
    Run-ManualNetworkScenario
    Run-ManualRebootScenario
}

Push-Location $RepoRoot
try {
    Assert-PathExists $ProtocolDoc "Protocol document"
    New-Item -ItemType Directory -Force -Path $ManualTestingDir | Out-Null
    New-Item -ItemType Directory -Force -Path $GoCachePath | Out-Null

    if ($Rebuild -or $Mode -eq "build") {
        Invoke-HardSyncBuild
        if ($Mode -eq "build") {
            Write-Host "Build-only mode complete." -ForegroundColor Green
            return
        }
    }

    switch ($Mode) {
        "wal"            { Run-WalTest }
        "udp"            { Run-UdpTest }
        "clock"          { Run-ClockTamperTest }
        "manual-network" { Run-ManualNetworkScenario }
        "manual-reboot"  { Run-ManualRebootScenario }
        "all"            { Run-All }
        "reset" {
            Write-Step "Reset mode"
            if (Test-Path $ReportPath) {
                Remove-Item -Force $ReportPath
                Write-Host "Removed report: $ReportPath" -ForegroundColor Yellow
            }
            if (Test-Path $GoCachePath) {
                Remove-Item -Recurse -Force $GoCachePath
                Write-Host "Removed Go cache: $GoCachePath" -ForegroundColor Yellow
            }
            Write-Host "Reset complete." -ForegroundColor Green
        }
        default {
            throw "Unsupported mode: $Mode"
        }
    }

    if ($Mode -ne "reset" -and $Mode -ne "build") {
        Write-Step "Done"
        Write-Host "Story 1.11 validation flow complete." -ForegroundColor Green
        Write-Host "Report: $ReportPath" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
