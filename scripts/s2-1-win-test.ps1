param(
    [ValidateSet("user-auto", "build-only", "run-only", "ui-only")]
    [string]$Mode = "user-auto",
    [switch]$SkipBuild,
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

try {
    if (-not $SkipBuild -and ($Mode -eq "user-auto" -or $Mode -eq "build-only")) {
        Invoke-StoryBuild -RepoRoot $RepoRoot -Target "server"
        $notes.Add("Build completed for target: server")
    }

    if ($Mode -eq "build-only") {
        Write-StoryReport -StoryId $StoryId -Status "PASS" -ReportPath $ReportPath -Notes $notes
        exit 0
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
        $exePath = Get-StoryBuildPath -RepoRoot $RepoRoot -Target "server"
        $appProcess = Start-StoryApp -ExecutablePath $exePath
        Assert-StoryCondition -Condition (-not $appProcess.HasExited) -FailureMessage "Server UI process exited too early."
        Start-Sleep -Seconds 5
        Assert-StoryCondition -Condition (-not $appProcess.HasExited) -FailureMessage "Server UI process became unstable during smoke window."
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
    if ($null -ne $appProcess) {
        Stop-StoryApp -Process $appProcess
    }
}
