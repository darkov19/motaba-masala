param(
    [ValidateSet("user-auto", "go-test", "frontend-test")]
    [string]$Mode = "user-auto",
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-2e"
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
    $authApiFile = Join-Path $RepoRoot "frontend\src\services\authApi.ts"
    $usersFormFile = Join-Path $RepoRoot "frontend\src\components\forms\AdminUserForm.tsx"
    $rbacFile = Join-Path $RepoRoot "frontend\src\shell\rbac.ts"
    $shellNavFile = Join-Path $RepoRoot "frontend\src\shell\RoleShellNavigation.tsx"
    $authTestFile = Join-Path $RepoRoot "frontend\src\__tests__\AppAuthLifecycle.test.tsx"
    $appGoFile = Join-Path $RepoRoot "internal\app\app.go"
    $serverMainFile = Join-Path $RepoRoot "cmd\server\main.go"

    Assert-ContentMatch -Path $appFile -Pattern "Sign In" -FailureMessage "Login entry screen is missing in App.tsx."
    Assert-ContentMatch -Path $appFile -Pattern "AUTH_SESSION_EXPIRED_EVENT" -FailureMessage "Session-expiry handling hook missing in App.tsx."
    Assert-ContentMatch -Path $authApiFile -Pattern "CreateUser" -FailureMessage "Auth API wrapper for CreateUser is missing."
    Assert-ContentMatch -Path $usersFormFile -Pattern "Create User" -FailureMessage "Admin users create form missing."
    Assert-ContentMatch -Path $rbacFile -Pattern "system-users" -FailureMessage "system.users route is not mapped to dedicated users view."
    Assert-ContentMatch -Path $shellNavFile -Pattern "Logout" -FailureMessage "Logout control missing in role shell navigation."
    Assert-ContentMatch -Path $authTestFile -Pattern "Authentication lifecycle" -FailureMessage "Auth lifecycle regression suite missing."
    Assert-ContentMatch -Path $appGoFile -Pattern "func \(a \*App\) Login\(" -FailureMessage "App.Login binding is missing in internal/app/app.go."
    Assert-ContentMatch -Path $appGoFile -Pattern "func \(a \*App\) CreateUser\(" -FailureMessage "App.CreateUser binding is missing in internal/app/app.go."
    Assert-ContentMatch -Path $serverMainFile -Pattern "SetAuthService\(" -FailureMessage "Server wiring for auth service binding is missing."

    $notes.Add("Validated auth login gate, session-expiry handling, admin user creation surface, logout control, App auth bindings, and lifecycle regression tests.")

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
