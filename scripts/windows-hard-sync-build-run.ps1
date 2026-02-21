param(
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [switch]$SkipInstallers
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildDir = Join-Path $RepoRoot "build"
$DistDir = Join-Path $RepoRoot "dist"
$ServerBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$ClientExe = Join-Path $RepoRoot "build\bin\masala_inventory_client.exe"
$InstallerScript = Join-Path $RepoRoot "scripts\windows\installer\masala-installer.nsi"
$ServerInstaller = Join-Path $DistDir "Masala Inventory Server Setup.exe"
$ClientInstaller = Join-Path $DistDir "Masala Inventory Client Setup.exe"
$ServerIconPath = Join-Path $RepoRoot "cmd\server\assets\icon.ico"
$RsrcMissingWarningShown = $false

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-CommandSucceeded([string]$CommandName) {
    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
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

function Get-GoBuildLdflags([string]$WailsLdflags) {
    $parts = @("-H=windowsgui")
    if (-not [string]::IsNullOrWhiteSpace($WailsLdflags)) {
        $parts += $WailsLdflags
    }
    return ($parts -join " ")
}

function Try-GenerateSyso([string]$PackageDir) {
    if (-not (Test-Path $ServerIconPath)) {
        return
    }

    $rsrcCmd = Get-Command rsrc -ErrorAction SilentlyContinue
    if ($null -eq $rsrcCmd) {
        if (-not $RsrcMissingWarningShown) {
            Write-Warning "rsrc not found; fallback binaries will use default app icon. Install with: go install github.com/akavel/rsrc@latest"
            $script:RsrcMissingWarningShown = $true
        }
        return
    }

    $sysoPath = Join-Path $PackageDir "rsrc_windows_amd64.syso"
    & rsrc -ico $ServerIconPath -o $sysoPath
    Assert-CommandSucceeded "rsrc icon resource generation"
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
    Assert-CommandSucceeded "wails build"

    $header = Get-HeaderHex $ServerBuildExe
    if ($header -ne "4D5A") {
        Write-Warning "Wails output is not a PE executable (header=$header). Falling back to go build."
        New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "build\bin") | Out-Null
        $env:CGO_ENABLED = "1"
        Try-GenerateSyso (Join-Path $RepoRoot "cmd\server")
        $goLdflags = Get-GoBuildLdflags $ldflags

        if ([string]::IsNullOrWhiteSpace($ldflags)) {
            & go build -buildmode=exe -tags "desktop,production,native_webview2loader" -ldflags $goLdflags -o $ServerBuildExe .\cmd\server
        }
        else {
            & go build -buildmode=exe -tags "desktop,production,native_webview2loader" -ldflags $goLdflags -o $ServerBuildExe .\cmd\server
        }
        Assert-CommandSucceeded "go build fallback"
    }

    Assert-PeExecutable $ServerBuildExe
}

function Build-ClientBinary {
    $ldflags = Get-Ldflags
    $goLdflags = Get-GoBuildLdflags $ldflags
    New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "build\bin") | Out-Null
    $env:CGO_ENABLED = "1"
    Try-GenerateSyso (Join-Path $RepoRoot "cmd\client")

    Write-Step "Build client binary"
    & go build -buildmode=exe -tags "desktop,production,native_webview2loader" -ldflags $goLdflags -o $ClientExe .\cmd\client
    Assert-CommandSucceeded "go build client"
    Assert-PeExecutable $ClientExe
}

function Assert-Makensis {
    $cmd = Get-Command makensis -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        throw "makensis not found in PATH. Install NSIS or run with -SkipInstallers."
    }
}

function Build-Installers {
    if (-not (Test-Path $InstallerScript)) {
        throw "Installer script not found: $InstallerScript"
    }
    Assert-Makensis
    New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

    Write-Step "Build server installer (NSIS)"
    & makensis "/DAPP_KIND=server" $InstallerScript
    Assert-CommandSucceeded "makensis server"

    Write-Step "Build client installer (NSIS)"
    & makensis "/DAPP_KIND=client" $InstallerScript
    Assert-CommandSucceeded "makensis client"
}

function Write-DevLauncher {
    $launcherPath = Join-Path $RepoRoot "build\bin\run-server-dev.ps1"
    $content = @'
param(
    [string]$JwtSecret = "dev-only-jwt-secret-change-me"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exePath = Join-Path $scriptDir "masala_inventory_server.exe"

if (-not (Test-Path $exePath)) {
    throw "Server executable not found: $exePath"
}

$env:MASALA_APP_ENV = "development"
$env:MASALA_JWT_SECRET = $JwtSecret

Write-Host "Launching server in development mode..." -ForegroundColor Cyan
Write-Host "MASALA_APP_ENV=$env:MASALA_APP_ENV" -ForegroundColor DarkGray
Write-Host "MASALA_JWT_SECRET=***" -ForegroundColor DarkGray
& $exePath
'@
    Set-Content -Path $launcherPath -Value $content -Encoding UTF8
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
    if (Test-Path $DistDir) {
        Remove-Item -Recurse -Force $DistDir
    }

    Build-App
    Build-ClientBinary
    Write-DevLauncher

    if (-not $SkipInstallers) {
        Build-Installers
    }

    Write-Step "Build completed"
    Write-Host "Output: $ServerBuildExe" -ForegroundColor Green
    Write-Host "Output: $ClientExe" -ForegroundColor Green
    Write-Host "Helper: $(Join-Path $RepoRoot 'build\bin\run-server-dev.ps1')" -ForegroundColor Green
    if (-not $SkipInstallers) {
        Write-Host "Output: $ServerInstaller" -ForegroundColor Green
        Write-Host "Output: $ClientInstaller" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
