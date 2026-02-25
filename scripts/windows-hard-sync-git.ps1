param(
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [switch]$SkipClean,
    [switch]$SkipBuildClean,
    [switch]$Force = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-CommandSucceeded([string]$CommandName) {
    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

Push-Location $RepoRoot
try {
    if (-not $Force) {
        Write-Warning "This script will DISCARD local git changes."
        Write-Host "Re-run with -Force to continue." -ForegroundColor Yellow
        exit 2
    }

    Write-Step "Fetch latest from $Remote"
    & git fetch $Remote --prune
    Assert-CommandSucceeded "git fetch"

    Write-Step "Hard reset to $Remote/$Branch"
    & git reset --hard "$Remote/$Branch"
    Assert-CommandSucceeded "git reset --hard"

    if (-not $SkipClean) {
        Write-Step "Remove untracked files/directories (git clean -fd)"
        & git clean -fd
        Assert-CommandSucceeded "git clean -fd"
    }

    if (-not $SkipBuildClean) {
        Write-Step "Remove ignored build artifacts for fresh rebuilds"
        & git clean -fdX -- build frontend/dist frontend/wailsjs bin .cache
        Assert-CommandSucceeded "git clean -fdX (build artifacts)"
    }

    Write-Step "Final status"
    & git status --short --branch
    Assert-CommandSucceeded "git status"

    Write-Host ""
    Write-Host "Hard sync complete." -ForegroundColor Green
}
finally {
    Pop-Location
}
