param(
    [ValidateSet("user-auto", "docs-only", "go-test")]
    [string]$Mode = "user-auto",
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-2a"
$ScriptRoot = $PSScriptRoot
$CommonPath = Join-Path $ScriptRoot "lib\win-story-common.ps1"
if (-not (Test-Path $CommonPath)) {
    throw "Shared script library not found: $CommonPath"
}

. $CommonPath

$RepoRoot = Get-StoryRepoRoot -ScriptRoot $ScriptRoot
$notes = New-Object System.Collections.Generic.List[string]

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
    $contractPath = Join-Path $RepoRoot "docs\navigation-rbac-contract.md"
    Assert-ContentMatch -Path $contractPath -Pattern "Canonical Route Map" -FailureMessage "Contract file missing route map section."
    Assert-ContentMatch -Path $contractPath -Pattern "RBAC Contract: Role x Module x Action Matrix" -FailureMessage "Contract file missing RBAC matrix section."
    Assert-ContentMatch -Path $contractPath -Pattern "Frontend vs Backend Authority" -FailureMessage "Contract file missing backend authority section."
    $notes.Add("Contract document exists with required sections.")

    $storyB = Join-Path $RepoRoot "docs\stories\2-2b-app-shell-role-variants.md"
    $storyC = Join-Path $RepoRoot "docs\stories\2-2c-docs-alignment-cohesive-app.md"
    $epics = Join-Path $RepoRoot "docs\epics.md"

    Assert-ContentMatch -Path $storyB -Pattern "docs/navigation-rbac-contract.md" -FailureMessage "Story 2.2B does not reference the contract."
    Assert-ContentMatch -Path $storyC -Pattern "docs/navigation-rbac-contract.md" -FailureMessage "Story 2.2C does not reference the contract."
    Assert-ContentMatch -Path $epics -Pattern "docs/navigation-rbac-contract.md" -FailureMessage "docs/epics.md does not reference the contract for downstream stories."
    $notes.Add("Downstream references verified (2.2B, 2.2C, Epic 2 stories).")

    if ($Mode -eq "user-auto" -or $Mode -eq "go-test") {
        Push-Location $RepoRoot
        try {
            $cacheRoot = if ([string]::IsNullOrWhiteSpace($env:TEMP)) { Join-Path $RepoRoot "tmp\go-build-cache" } else { Join-Path $env:TEMP "go-build-cache" }
            New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
            $env:GOCACHE = $cacheRoot
            & go test ./...
            if ($LASTEXITCODE -ne 0) {
                throw "go test ./... failed with exit code $LASTEXITCODE"
            }
            $notes.Add("go test ./... passed (GOCACHE=$cacheRoot).")
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
