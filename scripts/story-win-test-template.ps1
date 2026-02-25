param(
    [ValidateSet("user-auto", "build-only", "run-only")]
    [string]$Mode = "user-auto",
    [switch]$SkipBuild,
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "X-Y"
$ScriptRoot = $PSScriptRoot
$CommonPath = Join-Path $ScriptRoot "lib\win-story-common.ps1"
if (-not (Test-Path $CommonPath)) {
    throw "Shared script library not found: $CommonPath"
}

. $CommonPath

$RepoRoot = Get-StoryRepoRoot -ScriptRoot $ScriptRoot

# CHANGE THIS PER STORY: server | client | both
$BuildTarget = "server"
# CHANGE THIS PER STORY: server | client
$RunTarget = "server"

$notes = New-Object System.Collections.Generic.List[string]
$appProcess = $null

try {
    if (-not $SkipBuild -and ($Mode -eq "user-auto" -or $Mode -eq "build-only")) {
        Invoke-StoryBuild -RepoRoot $RepoRoot -Target $BuildTarget
        $notes.Add("Build completed for target: $BuildTarget")
    }

    if ($Mode -eq "build-only") {
        Write-StoryReport -StoryId $StoryId -Status "PASS" -ReportPath $ReportPath -Notes $notes
        exit 0
    }

    if ($Mode -eq "user-auto" -or $Mode -eq "run-only") {
        $exePath = Get-StoryBuildPath -RepoRoot $RepoRoot -Target $RunTarget
        $appProcess = Start-StoryApp -ExecutablePath $exePath
        Assert-StoryCondition -Condition (-not $appProcess.HasExited) -FailureMessage "App exited too early."
        $notes.Add("Runtime smoke check passed ($RunTarget process started and stayed alive).")

        # STORY-SPECIFIC ASSERTIONS:
        # 1) Add checks specific to this story's acceptance criteria.
        # 2) Throw on failure to ensure non-zero exit code.
        # Example:
        # Assert-StoryCondition -Condition (Test-Path "some-output-file") -FailureMessage "Expected output missing."
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
