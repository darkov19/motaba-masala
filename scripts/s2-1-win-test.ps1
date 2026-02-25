param(
    [ValidateSet("user-auto", "build-only", "run-only", "ui-only")]
    [string]$Mode = "user-auto",
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-1"
$ScriptRoot = $PSScriptRoot
$CommonPath = Join-Path $ScriptRoot "lib\win-story-common.ps1"
if (-not (Test-Path $CommonPath)) {
    throw "Shared script library not found: $CommonPath"
}

. $CommonPath

$RepoRoot = Get-StoryRepoRoot -ScriptRoot $ScriptRoot
$notes = New-Object System.Collections.Generic.List[string]
$appProcess = $null
$originalAppEnv = $env:MASALA_APP_ENV
$originalJwt = $env:MASALA_JWT_SECRET
$originalWatchdog = $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH

try {
    if ($Mode -eq "build-only") {
        Write-StoryReport -StoryId $StoryId -Status "FAIL" -ReportPath $ReportPath -Notes @(
            "Build is intentionally disabled in s2-1-win-test.ps1.",
            "Run .\\scripts\\windows-hard-sync-build-run.ps1 to produce fresh binaries first."
        )
        exit 1
    }

    $exePath = Get-StoryBuildPath -RepoRoot $RepoRoot -Target "server"
    if (-not (Test-Path $exePath)) {
        throw "Server binary not found at $exePath. Run .\scripts\windows-hard-sync-build-run.ps1 first."
    }

    if ($Mode -eq "user-auto" -or $Mode -eq "run-only") {
        Push-Location $RepoRoot
        try {
            & go run ./cmd/story_automation_probe -scenario item-master-packaging
            if ($LASTEXITCODE -ne 0) {
                throw "Story automation probe failed with exit code $LASTEXITCODE"
            }
            $notes.Add("Probe scenario 'item-master-packaging' passed.")
        }
        finally {
            Pop-Location
        }
    }

    if ($Mode -eq "user-auto" -or $Mode -eq "ui-only") {
        # Ensure deterministic startup in validation environments where local .env files may be absent.
        $env:MASALA_APP_ENV = "development"
        $env:MASALA_JWT_SECRET = "dev-only-jwt-secret-change-me"
        $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH = "1"

        $appProcess = Start-StoryApp -ExecutablePath $exePath
        $existing = Get-Process -Name "masala_inventory_server" -ErrorAction SilentlyContinue |
            Where-Object { $_.Id -ne $appProcess.Id }
        if ($null -ne $existing) {
            $existing | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            if ($appProcess.HasExited) {
                $appProcess = Start-StoryApp -ExecutablePath $exePath
            }
            $notes.Add("Stopped pre-existing server instance before UI smoke.")
        }

        if ($appProcess.HasExited) {
            $exitCode = $appProcess.ExitCode
            throw "Server UI process exited too early (exit code: $exitCode)."
        }
        Start-Sleep -Seconds 5
        if ($appProcess.HasExited) {
            $exitCode = $appProcess.ExitCode
            throw "Server UI process became unstable during smoke window (exit code: $exitCode)."
        }
        $notes.Add("UI smoke passed (server app launched and stayed alive for 5s).")
    }

    Write-StoryReport -StoryId $StoryId -Status "PASS" -ReportPath $ReportPath -Notes $notes
    exit 0
}
catch {
    $notes.Add("Failure: $($_.Exception.Message)")
    Write-StoryReport -StoryId $StoryId -Status "FAIL" -ReportPath $ReportPath -Notes $notes
    exit 1
}
finally {
    $env:MASALA_APP_ENV = $originalAppEnv
    $env:MASALA_JWT_SECRET = $originalJwt
    $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH = $originalWatchdog
    if ($null -ne $appProcess) {
        Stop-StoryApp -Process $appProcess
    }
}
