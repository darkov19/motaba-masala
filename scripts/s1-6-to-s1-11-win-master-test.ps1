param(
    [switch]$Rebuild,
    [switch]$SkipInstallers,
    [string]$ReportPath = "",

    [string]$S16Mode = "auto",
    [string]$S17Mode = "auto",
    [string]$S18Mode = "auto",
    [string]$S19Mode = "all",
    [string]$S110Mode = "all",
    [string]$S111Mode = "user-auto"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildScript = Join-Path $RepoRoot "scripts\windows-hard-sync-build-run.ps1"
$ManualTestingDir = Join-Path $RepoRoot "docs\manual_testing"

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $dateTag = Get-Date -Format "yyyy-MM-dd"
    $ReportPath = Join-Path $ManualTestingDir ("stories-1-6-to-1-11-validation-{0}.md" -f $dateTag)
}

$script:Results = New-Object System.Collections.Generic.List[object]

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-ReportDir {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null
}

function Start-Report {
    Ensure-ReportDir

    $header = @(
        "# Stories 1.6 to 1.11 Validation Report"
        ""
        "- Date: $(Get-Date -Format \"yyyy-MM-dd HH:mm:ss\")"
        "- Script: `scripts/s1-6-to-s1-11-win-master-test.ps1`"
        "- Rebuild requested: $Rebuild"
        "- Skip installers during rebuild: $SkipInstallers"
        ""
        "## Story Results"
        ""
        "| Story | Mode | Result | Notes |"
        "| --- | --- | --- | --- |"
    ) -join "`r`n"

    Set-Content -Path $ReportPath -Value $header -Encoding UTF8
}

function Add-Result([string]$Story, [string]$Mode, [string]$Result, [string]$Notes) {
    $safeNotes = ($Notes -replace "\r", " " -replace "\n", " " -replace "\|", "/")
    $line = "| $Story | $Mode | $Result | $safeNotes |"
    Add-Content -Path $ReportPath -Value $line

    $script:Results.Add([pscustomobject]@{
            Story  = $Story
            Mode   = $Mode
            Result = $Result
            Notes  = $Notes
        }) | Out-Null
}

function Invoke-StoryScript([string]$Story, [string]$ScriptPath, [string]$Mode, [string[]]$ExtraArgs = @()) {
    Write-Step "$Story ($Mode)"

    if (-not (Test-Path $ScriptPath)) {
        Add-Result $Story $Mode "FAIL" "Script not found: $ScriptPath"
        Write-Host "FAIL: missing script $ScriptPath" -ForegroundColor Red
        return
    }

    $allArgs = @("-ExecutionPolicy", "Bypass", "-File", $ScriptPath, "-Mode", $Mode) + $ExtraArgs

    try {
        & powershell @allArgs
        if ($LASTEXITCODE -eq 0) {
            Add-Result $Story $Mode "PASS" "Completed"
            Write-Host "PASS: $Story" -ForegroundColor Green
        }
        else {
            Add-Result $Story $Mode "FAIL" "Exit code: $LASTEXITCODE"
            Write-Host "FAIL: $Story (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    }
    catch {
        Add-Result $Story $Mode "FAIL" $_.Exception.Message
        Write-Host "FAIL: $Story ($($_.Exception.Message))" -ForegroundColor Red
    }
}

function Maybe-Rebuild {
    if (-not $Rebuild) {
        return
    }

    Write-Step "Rebuild once in master script"
    if (-not (Test-Path $BuildScript)) {
        throw "Build script not found: $BuildScript"
    }

    Write-Host "WARNING: this build script may reset local changes." -ForegroundColor Yellow
    if ($SkipInstallers) {
        & powershell -ExecutionPolicy Bypass -File $BuildScript -SkipInstallers
    }
    else {
        & powershell -ExecutionPolicy Bypass -File $BuildScript
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Master rebuild failed with exit code $LASTEXITCODE"
    }
}

Push-Location $RepoRoot
try {
    Start-Report
    Maybe-Rebuild

    Invoke-StoryScript "Story 1.6" (Join-Path $PSScriptRoot "s1-6-win-test.ps1") $S16Mode
    Invoke-StoryScript "Story 1.7" (Join-Path $PSScriptRoot "s1-7-win-test.ps1") $S17Mode
    Invoke-StoryScript "Story 1.8" (Join-Path $PSScriptRoot "s1-8-win-test.ps1") $S18Mode
    Invoke-StoryScript "Story 1.9" (Join-Path $PSScriptRoot "s1-9-win-test.ps1") $S19Mode
    Invoke-StoryScript "Story 1.10" (Join-Path $PSScriptRoot "s1-10-win-test.ps1") $S110Mode
    Invoke-StoryScript "Story 1.11" (Join-Path $PSScriptRoot "s1-11-win-test.ps1") $S111Mode

    Add-Content -Path $ReportPath -Value ""
    Add-Content -Path $ReportPath -Value "## Summary"

    $passCount = ($script:Results | Where-Object { $_.Result -eq "PASS" }).Count
    $failCount = ($script:Results | Where-Object { $_.Result -eq "FAIL" }).Count
    Add-Content -Path $ReportPath -Value ""
    Add-Content -Path $ReportPath -Value "- PASS: $passCount"
    Add-Content -Path $ReportPath -Value "- FAIL: $failCount"

    Write-Step "Master run complete"
    Write-Host "PASS: $passCount | FAIL: $failCount" -ForegroundColor Cyan
    Write-Host "Combined report: $ReportPath" -ForegroundColor Green

    if ($failCount -gt 0) {
        exit 1
    }
}
finally {
    Pop-Location
}
