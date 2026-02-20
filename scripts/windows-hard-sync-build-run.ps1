param(
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildDir = Join-Path $RepoRoot "build"
$BuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-HeaderHex([string]$Path) {
    if (-not (Test-Path $Path)) {
        return ""
    }
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 2) {
        return ""
    }
    return ("{0:X2}{1:X2}" -f $bytes[0], $bytes[1])
}

function Assert-PeExecutable([string]$Path) {
    if (-not (Test-Path $Path)) {
        throw "Expected executable not found: $Path"
    }
    $header = Get-HeaderHex $Path
    if ($header -ne "4D5A") {
        throw "Build output is not a Windows PE executable (MZ). Header=$header Path=$Path"
    }
}

function Get-Ldflags {
    $publicKey = $env:MASALA_LICENSE_PUBLIC_KEY
    if ([string]::IsNullOrWhiteSpace($publicKey)) {
        return ""
    }
    return "-X main.LicensePublicKey=$publicKey"
}

function Build-App {
    $ldflags = Get-Ldflags

    Write-Step "Build app with Wails"
    if ([string]::IsNullOrWhiteSpace($ldflags)) {
        & wails build -clean -platform windows/amd64
    }
    else {
        & wails build -clean -platform windows/amd64 -ldflags $ldflags
    }

    $header = Get-HeaderHex $BuildExe
    if ($header -ne "4D5A") {
        Write-Warning "Wails output is not a PE executable (header=$header). Falling back to go build."
        New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "build\bin") | Out-Null
        $env:CGO_ENABLED = "1"

        if ([string]::IsNullOrWhiteSpace($ldflags)) {
            & go build -tags "desktop,production,native_webview2loader" -o $BuildExe .\cmd\server
        }
        else {
            & go build -tags "desktop,production,native_webview2loader" -ldflags $ldflags -o $BuildExe .\cmd\server
        }
    }

    Assert-PeExecutable $BuildExe
}

Push-Location $RepoRoot
try {
    Write-Step "Fetch latest from $Remote"
    & git fetch $Remote

    Write-Step "Hard reset to $Remote/$Branch"
    & git reset --hard "$Remote/$Branch"

    Write-Step "Delete build directory"
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }

    Build-App
    Write-Step "Build completed"
    Write-Host "Output: $BuildExe" -ForegroundColor Green
}
finally {
    Pop-Location
}
