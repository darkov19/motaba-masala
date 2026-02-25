param(
    [ValidateSet("user-auto", "go-test", "frontend-test")]
    [string]$Mode = "user-auto",
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-2b"
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
    $appFile = Join-Path $RepoRoot "frontend\src\App.tsx"
    $rbacFile = Join-Path $RepoRoot "frontend\src\shell\rbac.ts"
    $appShellFile = Join-Path $RepoRoot "frontend\src\shell\AppShell.tsx"
    $adminShellFile = Join-Path $RepoRoot "frontend\src\shell\AdminShell.tsx"
    $operatorShellFile = Join-Path $RepoRoot "frontend\src\shell\OperatorShell.tsx"
    $rbacTestFile = Join-Path $RepoRoot "frontend\src\__tests__\AppShellRBAC.test.tsx"
    $goAppFile = Join-Path $RepoRoot "internal\app\app.go"
    $serverMainFile = Join-Path $RepoRoot "cmd\server\main.go"

    Assert-ContentMatch -Path $appFile -Pattern "Shared AppShell Workspace" -FailureMessage "App shell workspace marker missing in App.tsx."
    Assert-ContentMatch -Path $rbacFile -Pattern "dashboard\.home" -FailureMessage "Canonical route registry missing in rbac.ts."
    Assert-ContentMatch -Path $appShellFile -Pattern "Unauthorized" -FailureMessage "Unauthorized feedback block missing in AppShell.tsx."
    Assert-ContentMatch -Path $adminShellFile -Pattern "AdminShell" -FailureMessage "AdminShell implementation missing."
    Assert-ContentMatch -Path $operatorShellFile -Pattern "OperatorShell" -FailureMessage "OperatorShell implementation missing."
    Assert-ContentMatch -Path $rbacTestFile -Pattern "blocks operator direct navigation" -FailureMessage "RBAC navigation regression test missing."
    Assert-ContentMatch -Path $rbacTestFile -Pattern "ignores tampered storage role" -FailureMessage "Trusted-session tamper regression test is missing in AppShellRBAC tests."
    Assert-ContentMatch -Path $goAppFile -Pattern "GetSessionRole\(" -FailureMessage "Trusted session-role binding method GetSessionRole is missing in internal/app/app.go."
    Assert-ContentMatch -Path $serverMainFile -Pattern "SetSessionRoleResolver\(" -FailureMessage "Server wiring for session role resolver is missing in cmd/server/main.go."
    Assert-ContentMatch -Path $appFile -Pattern "GetSessionRole\?" -FailureMessage "Frontend session-role bridge binding usage is missing in App.tsx."

    $notes.Add("Validated route registry, AppShell variants, unauthorized feedback, trusted session-role wiring, and RBAC regression test artifacts.")

    Push-Location $RepoRoot
    try {
        if ($Mode -eq "user-auto" -or $Mode -eq "go-test") {
            $cacheRoot = if ([string]::IsNullOrWhiteSpace($env:TEMP)) { Join-Path $RepoRoot "tmp\go-build-cache" } else { Join-Path $env:TEMP "go-build-cache" }
            New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
            $env:GOCACHE = $cacheRoot
            & go test ./...
            if ($LASTEXITCODE -ne 0) {
                throw "go test ./... failed with exit code $LASTEXITCODE"
            }
            $notes.Add("go test ./... passed (GOCACHE=$cacheRoot).")
        }

        if ($Mode -eq "user-auto" -or $Mode -eq "frontend-test") {
            & npm --prefix frontend run test:run
            if ($LASTEXITCODE -ne 0) {
                throw "npm --prefix frontend run test:run failed with exit code $LASTEXITCODE"
            }
            $notes.Add("frontend vitest suite passed.")
        }
    }
    finally {
        Pop-Location
    }

    Write-StoryReport -StoryId $StoryId -Status "PASS" -ReportPath $ReportPath -Notes $notes
    exit 0
}
catch {
    $notes.Add("Failure: $($_.Exception.Message)")
    Write-StoryReport -StoryId $StoryId -Status "FAIL" -ReportPath $ReportPath -Notes $notes
    exit 1
}
