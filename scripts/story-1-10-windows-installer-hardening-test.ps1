param(
    [ValidateSet("all", "build", "server", "client", "unchecked", "uninstall", "reset")]
    [string]$Mode = "all",
    [ValidateSet("server", "client")]
    [string]$UncheckedKind = "client",
    [switch]$Rebuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$InstallerScript = Join-Path $RepoRoot "scripts\windows\installer\masala-installer.nsi"
$DistDir = Join-Path $RepoRoot "dist"
$ServerInstallerName = "Masala Inventory Server Setup.exe"
$ClientInstallerName = "Masala Inventory Client Setup.exe"
$ServerInstallerPath = Join-Path $DistDir $ServerInstallerName
$ClientInstallerPath = Join-Path $DistDir $ClientInstallerName

$FirewallRuleNames = @(
    "Masala Inventory Server",
    "Masala Inventory Server TCP 8090",
    "Masala Inventory Server UDP 8090"
)

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
        throw "Run this script in an elevated PowerShell session (Run as Administrator)."
    }
}

function Assert-InstallerScript {
    if (-not (Test-Path $InstallerScript)) {
        throw "Installer script not found: $InstallerScript"
    }
}

function Assert-Makensis {
    $cmd = Get-Command makensis -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        throw "makensis not found in PATH. Install NSIS first."
    }
}

function Build-Installer([string]$Kind) {
    Assert-InstallerScript
    Assert-Makensis
    Write-Step "Build $Kind installer"
    & makensis "/DAPP_KIND=$Kind" $InstallerScript
    if ($LASTEXITCODE -ne 0) {
        throw "makensis failed for kind=$Kind with exit code $LASTEXITCODE"
    }
}

function Get-StartupFolder {
    return [Environment]::GetFolderPath("CommonStartup")
}

function Get-StartupLinkPath([string]$Kind) {
    $startup = Get-StartupFolder
    if ($Kind -eq "server") {
        return Join-Path $startup "MasalaServer.lnk"
    }
    return Join-Path $startup "MasalaClient.lnk"
}

function Get-LegacyUserStartupLinkPath([string]$Kind) {
    $startup = [Environment]::GetFolderPath("Startup")
    if ($Kind -eq "server") {
        return Join-Path $startup "MasalaServer.lnk"
    }
    return Join-Path $startup "MasalaClient.lnk"
}

function Assert-StartupLink([string]$Kind, [bool]$ShouldExist) {
    $path = Get-StartupLinkPath $Kind
    $exists = Test-Path $path

    if ($ShouldExist -and -not $exists) {
        throw "Expected startup shortcut missing: $path"
    }
    if (-not $ShouldExist -and $exists) {
        throw "Expected startup shortcut to be absent, but found: $path"
    }

    if ($ShouldExist) {
        Write-Host "PASS: startup shortcut exists -> $path" -ForegroundColor Green
    }
    else {
        Write-Host "PASS: startup shortcut is absent -> $path" -ForegroundColor Green
    }
}

function Get-FirewallRuleByName([string]$Name) {
    return Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
}

function Assert-FirewallRules([bool]$ShouldExist) {
    foreach ($ruleName in $FirewallRuleNames) {
        $rule = Get-FirewallRuleByName $ruleName
        $exists = $null -ne $rule
        if ($ShouldExist -and -not $exists) {
            throw "Expected firewall rule missing: $ruleName"
        }
        if (-not $ShouldExist -and $exists) {
            throw "Expected firewall rule to be absent, but found: $ruleName"
        }
    }

    if ($ShouldExist) {
        Write-Host "PASS: required firewall rules are present." -ForegroundColor Green
    }
    else {
        Write-Host "PASS: required firewall rules are absent." -ForegroundColor Green
    }
}

function Show-FirewallRuleSummary {
    Write-Host ""
    Write-Host "Firewall rule snapshot:" -ForegroundColor Magenta
    Get-NetFirewallRule -DisplayName $FirewallRuleNames -ErrorAction SilentlyContinue |
        Select-Object DisplayName, Enabled, Direction, Action |
        Format-Table -AutoSize
}

function Run-InstallerInteractive([string]$Kind) {
    $installerPath = if ($Kind -eq "server") { $ServerInstallerPath } else { $ClientInstallerPath }
    if (-not (Test-Path $installerPath)) {
        throw "Installer executable not found: $installerPath"
    }

    Write-Step "Launching $Kind installer"
    Write-Host "Installer: $installerPath" -ForegroundColor Yellow
    Write-Host "Use default settings unless this scenario says otherwise." -ForegroundColor Yellow
    Start-Process -FilePath $installerPath -Wait
}

function Run-ScenarioServerChecked {
    Write-Step "Scenario: Server install with startup checkbox CHECKED (default)"
    Run-InstallerInteractive "server"
    Assert-FirewallRules $true
    Show-FirewallRuleSummary
    Assert-StartupLink "server" $true
    Read-Host "Manual check: verify installer completed successfully. Press Enter to continue" | Out-Null
}

function Run-ScenarioClientChecked {
    Write-Step "Scenario: Client install with startup checkbox CHECKED (default)"
    Run-InstallerInteractive "client"
    Assert-StartupLink "client" $true
    Read-Host "Manual check: verify installer completed successfully. Press Enter to continue" | Out-Null
}

function Run-ScenarioUnchecked([string]$Kind) {
    Write-Step "Scenario: $Kind install with startup checkbox UNCHECKED"
    Write-Host "When installer UI appears, UNCHECK: 'Start automatically when Windows starts'" -ForegroundColor Yellow
    Run-InstallerInteractive $Kind
    Assert-StartupLink $Kind $false
    if ($Kind -eq "server") {
        Assert-FirewallRules $true
        Show-FirewallRuleSummary
    }
}

function Get-UninstallerPath([string]$Kind) {
    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates += (Join-Path $env:ProgramFiles "Masala Inventory\$Kind\Uninstall.exe")
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates += (Join-Path ${env:ProgramFiles(x86)} "Masala Inventory\$Kind\Uninstall.exe")
    }

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }

    return ""
}

function Run-UninstallerIfPresent([string]$Kind) {
    $uninstaller = Get-UninstallerPath $Kind
    if ([string]::IsNullOrWhiteSpace($uninstaller)) {
        $checked = @()
        if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
            $checked += (Join-Path $env:ProgramFiles "Masala Inventory\$Kind\Uninstall.exe")
        }
        if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
            $checked += (Join-Path ${env:ProgramFiles(x86)} "Masala Inventory\$Kind\Uninstall.exe")
        }
        $paths = $checked -join "; "
        throw "Uninstaller not found for $Kind. Checked: $paths"
    }
    Write-Step "Run $Kind uninstaller"
    Start-Process -FilePath $uninstaller -Wait
}

function Run-ScenarioUninstallCleanup {
    Write-Step "Scenario: Uninstall cleanup verification"
    Run-UninstallerIfPresent "client"
    Run-UninstallerIfPresent "server"
    Assert-StartupLink "client" $false
    Assert-StartupLink "server" $false
    Assert-FirewallRules $false
}

function Remove-StartupLinkIfPresent([string]$Kind) {
    $path = Get-StartupLinkPath $Kind
    if (Test-Path $path) {
        Remove-Item -Force $path
        Write-Host "Removed startup shortcut: $path" -ForegroundColor Yellow
    }

    $legacyPath = Get-LegacyUserStartupLinkPath $Kind
    if (Test-Path $legacyPath) {
        Remove-Item -Force $legacyPath
        Write-Host "Removed legacy user startup shortcut: $legacyPath" -ForegroundColor Yellow
    }
}

function Remove-FirewallRulesIfPresent {
    foreach ($ruleName in $FirewallRuleNames) {
        $rule = Get-FirewallRuleByName $ruleName
        if ($null -ne $rule) {
            Remove-NetFirewallRule -DisplayName $ruleName
            Write-Host "Removed firewall rule: $ruleName" -ForegroundColor Yellow
        }
    }
}

Push-Location $RepoRoot
try {
    Assert-Admin

    if ($Mode -eq "reset") {
        Write-Step "Reset mode: remove test artifacts (shortcuts + firewall rules)"
        Remove-StartupLinkIfPresent "client"
        Remove-StartupLinkIfPresent "server"
        Remove-FirewallRulesIfPresent
        Write-Host "Reset complete." -ForegroundColor Green
        return
    }

    if ($Rebuild) {
        if ($Mode -in @("all", "build", "server", "uninstall")) {
            Build-Installer "server"
        }
        if ($Mode -in @("all", "build", "client", "unchecked", "uninstall")) {
            Build-Installer "client"
        }
    } elseif ($Mode -eq "build") {
        Write-Step "Build mode requires -Rebuild"
        Write-Host "Use: .\\scripts\\story-1-10-windows-installer-hardening-test.ps1 -Mode build -Rebuild" -ForegroundColor Yellow
        return
    }

    switch ($Mode) {
        "build" {
            Write-Host "Build mode complete." -ForegroundColor Green
        }
        "server" {
            Run-ScenarioServerChecked
        }
        "client" {
            Run-ScenarioClientChecked
        }
        "unchecked" {
            Run-ScenarioUnchecked $UncheckedKind
        }
        "uninstall" {
            Run-ScenarioUninstallCleanup
        }
        "all" {
            Run-ScenarioServerChecked
            Run-ScenarioClientChecked
            Run-ScenarioUnchecked "client"
            Run-ScenarioUninstallCleanup
            Write-Host ""
            Write-Host "Story 1.10 manual validation complete." -ForegroundColor Green
        }
        default {
            throw "Unsupported mode: $Mode"
        }
    }
}
finally {
    Pop-Location
}
