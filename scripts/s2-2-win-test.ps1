param(
    [ValidateSet("user-auto", "build-only", "run-only", "go-test")]
    [string]$Mode = "user-auto",
    [switch]$SkipBuild,
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-2"
$ScriptRoot = $PSScriptRoot
$CommonPath = Join-Path $ScriptRoot "lib\win-story-common.ps1"
if (-not (Test-Path $CommonPath)) {
    throw "Shared script library not found: $CommonPath"
}

. $CommonPath

$RepoRoot = Get-StoryRepoRoot -ScriptRoot $ScriptRoot
$notes = New-Object System.Collections.Generic.List[string]
$appProcess = $null

function Assert-ContentMatch {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$FailureMessage
    )

    if (-not (Test-Path $Path)) {
        throw "Required file not found: $Path"
    }

    $raw = Get-Content -Path $Path -Raw -Encoding UTF8
    if ($raw -notmatch $Pattern) {
        throw $FailureMessage
    }
}

try {
    $serviceFile = Join-Path $RepoRoot "internal\app\inventory\service.go"
    $domainConversionFile = Join-Path $RepoRoot "internal\domain\inventory\conversion.go"
    $repoFile = Join-Path $RepoRoot "internal\infrastructure\db\sqlite_inventory_repository.go"
    $migrationFile = Join-Path $RepoRoot "internal\infrastructure\db\migrations\000007_unit_conversions.up.sql"
    $apiFile = Join-Path $RepoRoot "cmd\server\api_server.go"

    Assert-ContentMatch -Path $serviceFile -Pattern "func \(s \*Service\) ConvertQuantity\(" -FailureMessage "ConvertQuantity service method is missing."
    Assert-ContentMatch -Path $domainConversionFile -Pattern "func ApplyUnitConversion\(" -FailureMessage "Domain conversion engine is missing."
    Assert-ContentMatch -Path $repoFile -Pattern "CreateUnitConversionRule" -FailureMessage "Repository conversion rule persistence is missing."
    Assert-ContentMatch -Path $migrationFile -Pattern "CREATE TABLE IF NOT EXISTS unit_conversions" -FailureMessage "unit_conversions migration is missing."
    Assert-ContentMatch -Path $apiFile -Pattern "/inventory/conversions/convert" -FailureMessage "Server conversion endpoint is missing."
    $notes.Add("Validated conversion service, domain engine, persistence, migration, and API endpoint wiring.")

    if (-not $SkipBuild -and ($Mode -eq "user-auto" -or $Mode -eq "build-only")) {
        Invoke-StoryBuild -RepoRoot $RepoRoot -Target "server"
        $notes.Add("Server build completed.")
    }

    if ($Mode -eq "build-only") {
        Write-StoryReport -StoryId $StoryId -Status "PASS" -ReportPath $ReportPath -Notes $notes
        exit 0
    }

    if ($Mode -eq "user-auto" -or $Mode -eq "run-only") {
        $exePath = Get-StoryBuildPath -RepoRoot $RepoRoot -Target "server"
        $appProcess = Start-StoryApp -ExecutablePath $exePath
        Assert-StoryCondition -Condition (-not $appProcess.HasExited) -FailureMessage "Server process exited too early."
        $notes.Add("Runtime smoke check passed (server process started and remained alive).")
    }

    if ($Mode -eq "user-auto" -or $Mode -eq "go-test") {
        Push-Location $RepoRoot
        try {
            $cacheRoot = if ([string]::IsNullOrWhiteSpace($env:TEMP)) { Join-Path $RepoRoot "tmp\go-build-cache" } else { Join-Path $env:TEMP "go-build-cache" }
            New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
            $env:GOCACHE = $cacheRoot

            & go test ./internal/domain/inventory ./internal/app/inventory ./internal/infrastructure/db ./cmd/server
            if ($LASTEXITCODE -ne 0) {
                throw "Conversion-focused go test suites failed with exit code $LASTEXITCODE"
            }
            $notes.Add("Conversion-focused Go test suites passed.")
        }
        finally {
            Pop-Location
        }
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
