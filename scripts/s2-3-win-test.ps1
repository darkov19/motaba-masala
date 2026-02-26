param(
    [ValidateSet("user-auto", "build-only", "run-only", "go-test")]
    [string]$Mode = "user-auto",
    [switch]$SkipBuild,
    [string]$ReportPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$StoryId = "2-3"
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
    $domainRecipeFile = Join-Path $RepoRoot "internal\domain\inventory\recipe.go"
    $serviceFile = Join-Path $RepoRoot "internal\app\inventory\service.go"
    $repoFile = Join-Path $RepoRoot "internal\infrastructure\db\sqlite_inventory_repository.go"
    $migrationFile = Join-Path $RepoRoot "internal\infrastructure\db\migrations\000008_recipes.up.sql"
    $apiFile = Join-Path $RepoRoot "cmd\server\api_server.go"
    $frontendFormFile = Join-Path $RepoRoot "frontend\src\components\forms\RecipeForm.tsx"

    Assert-ContentMatch -Path $domainRecipeFile -Pattern "type Recipe struct" -FailureMessage "Recipe domain model is missing."
    Assert-ContentMatch -Path $serviceFile -Pattern "func \(s \*Service\) CreateRecipe\(" -FailureMessage "CreateRecipe service method is missing."
    Assert-ContentMatch -Path $serviceFile -Pattern "func \(s \*Service\) UpdateRecipe\(" -FailureMessage "UpdateRecipe service method is missing."
    Assert-ContentMatch -Path $serviceFile -Pattern "func \(s \*Service\) ListRecipes\(" -FailureMessage "ListRecipes service method is missing."
    Assert-ContentMatch -Path $repoFile -Pattern "func \(r \*SqliteInventoryRepository\) CreateRecipe\(" -FailureMessage "Repository recipe create persistence is missing."
    Assert-ContentMatch -Path $migrationFile -Pattern "CREATE TABLE IF NOT EXISTS recipes" -FailureMessage "recipes migration is missing."
    Assert-ContentMatch -Path $migrationFile -Pattern "CREATE TABLE IF NOT EXISTS recipe_components" -FailureMessage "recipe_components migration is missing."
    Assert-ContentMatch -Path $apiFile -Pattern "/inventory/recipes/create" -FailureMessage "Recipe create API endpoint is missing."
    Assert-ContentMatch -Path $apiFile -Pattern "/inventory/recipes/update" -FailureMessage "Recipe update API endpoint is missing."
    Assert-ContentMatch -Path $apiFile -Pattern "/inventory/recipes/list" -FailureMessage "Recipe list API endpoint is missing."
    Assert-ContentMatch -Path $frontendFormFile -Pattern "Create Recipe" -FailureMessage "Recipe form UI is missing."
    $notes.Add("Validated recipe domain, service, persistence, migration, API, and frontend wiring.")

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
                throw "Recipe-focused go test suites failed with exit code $LASTEXITCODE"
            }
            $notes.Add("Recipe-focused Go test suites passed.")
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

