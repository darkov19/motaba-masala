param(
    [ValidateSet("user-auto", "build-only", "run-only", "go-test")]
    [string]$Mode = "user-auto",
    [switch]$SkipBuild,
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "3-1"
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
    $repoFile = Join-Path $RepoRoot "internal\infrastructure\db\sqlite_inventory_repository.go"
    $migrationFile = Join-Path $RepoRoot "internal\infrastructure\db\migrations\000010_grn_lines.up.sql"
    $apiFile = Join-Path $RepoRoot "cmd\server\api_server.go"
    $frontendFormFile = Join-Path $RepoRoot "frontend\src\components\forms\GRNForm.tsx"
    $frontendApiFile = Join-Path $RepoRoot "frontend\src\services\masterDataApi.ts"

    Assert-ContentMatch -Path $serviceFile -Pattern "func \(s \*Service\) CreateGRNRecord\(" -FailureMessage "CreateGRNRecord service method is missing."
    Assert-ContentMatch -Path $repoFile -Pattern "INSERT INTO grn_lines" -FailureMessage "GRN line persistence is missing."
    Assert-ContentMatch -Path $repoFile -Pattern "INSERT INTO stock_ledger" -FailureMessage "Stock ledger intake recording is missing."
    Assert-ContentMatch -Path $migrationFile -Pattern "CREATE TABLE IF NOT EXISTS grn_lines" -FailureMessage "grn_lines migration is missing."
    Assert-ContentMatch -Path $apiFile -Pattern "/inventory/grns/create" -FailureMessage "GRN create API endpoint is missing."
    Assert-ContentMatch -Path $frontendFormFile -Pattern "Add Line" -FailureMessage "GRN line-entry UI behavior is missing."
    Assert-ContentMatch -Path $frontendApiFile -Pattern "export async function createGRN" -FailureMessage "Frontend createGRN API contract is missing."
    $notes.Add("Validated GRN service, repository, migration, API, and frontend wiring.")

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

            & go test ./internal/app/inventory ./internal/infrastructure/db ./cmd/server
            if ($LASTEXITCODE -ne 0) {
                throw "GRN-focused go test suites failed with exit code $LASTEXITCODE"
            }
            $notes.Add("GRN-focused Go test suites passed.")
        }
        finally {
            Pop-Location
        }

        Push-Location (Join-Path $RepoRoot "frontend")
        try {
            & npm run test:run -- src/components/forms/__tests__/GRNForm.test.tsx
            if ($LASTEXITCODE -ne 0) {
                throw "GRN-focused frontend vitest suite failed with exit code $LASTEXITCODE"
            }
            $notes.Add("GRN-focused frontend vitest suite passed.")
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
