param(
    [ValidateSet("all", "expiring", "grace", "expired", "mismatch", "reset")]
    [string]$Mode = "all",
    [string]$AppPath = "",
    [switch]$SkipRestore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LicensePath = Join-Path $RepoRoot "license.key"
$LicenseBackupPath = Join-Path $RepoRoot "license.key.story1_9_backup"

if ([string]::IsNullOrWhiteSpace($AppPath)) {
    $DefaultBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
    $DefaultExe = Join-Path $RepoRoot "server.exe"

    if (Test-Path $DefaultBuildExe) {
        $AppPath = $DefaultBuildExe
    } elseif (Test-Path $DefaultExe) {
        $AppPath = $DefaultExe
    }
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-AppPath {
    if ([string]::IsNullOrWhiteSpace($AppPath)) {
        throw "No app executable found. Provide -AppPath or build the app first."
    }
    if (-not (Test-Path $AppPath)) {
        throw "App executable not found: $AppPath"
    }
}

function Backup-LicenseFile {
    if (-not (Test-Path $LicensePath)) {
        throw "license.key not found at: $LicensePath"
    }
    Copy-Item $LicensePath $LicenseBackupPath -Force
    Write-Host "Backed up license.key -> $LicenseBackupPath" -ForegroundColor Green
}

function Restore-LicenseFile {
    if (-not (Test-Path $LicenseBackupPath)) {
        Write-Warning "No backup file found at $LicenseBackupPath"
        return
    }
    Copy-Item $LicenseBackupPath $LicensePath -Force
    Write-Host "Restored license.key from backup." -ForegroundColor Green
}

function Get-LicenseSignatureFromCurrentFile {
    if (-not (Test-Path $LicensePath)) {
        throw "license.key not found: $LicensePath"
    }

    $raw = (Get-Content $LicensePath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "license.key is empty."
    }

    if ($raw.StartsWith("{")) {
        try {
            $obj = $raw | ConvertFrom-Json
            $sig = [string]$obj.signature
            if ([string]::IsNullOrWhiteSpace($sig)) {
                throw "JSON license has no 'signature' field."
            }
            return $sig.Trim()
        }
        catch {
            throw "Failed to parse JSON license payload: $($_.Exception.Message)"
        }
    }

    return $raw
}

function Assert-Signature([string]$Signature) {
    if ($Signature.Length -ne 128) {
        throw "Expected 128 hex chars for Ed25519 signature, got length=$($Signature.Length)"
    }
    if ($Signature -notmatch "^[0-9a-fA-F]+$") {
        throw "Signature is not valid hex."
    }
}

function Set-LicenseJson([string]$Signature, [string]$ExpiresAt) {
    Assert-Signature $Signature
    if ([string]::IsNullOrWhiteSpace($ExpiresAt)) {
        throw "ExpiresAt cannot be empty."
    }

    $payload = @{
        signature  = $Signature
        expires_at = $ExpiresAt
    } | ConvertTo-Json -Compress

    Set-Content -Path $LicensePath -Value $payload -NoNewline
}

function New-InvalidSignature {
    return ("00" * 64)
}

function Start-App([string]$ScenarioName) {
    Write-Host "Launching app for scenario: $ScenarioName" -ForegroundColor Yellow
    return Start-Process -FilePath $AppPath -WorkingDirectory $RepoRoot -PassThru
}

function Stop-App([System.Diagnostics.Process]$Process) {
    if ($null -eq $Process) {
        return
    }
    if (-not $Process.HasExited) {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Failed to stop process $($Process.Id): $($_.Exception.Message)"
        }
    }
}

function Run-InteractiveScenario(
    [string]$Name,
    [scriptblock]$Prepare,
    [string[]]$ExpectedChecks,
    [bool]$ExpectExitFast = $false
) {
    Write-Step $Name
    & $Prepare

    $proc = Start-App $Name
    Start-Sleep -Seconds 6

    if ($ExpectExitFast) {
        if ($proc.HasExited) {
            Write-Host "PASS: app exited quickly as expected for full lockout." -ForegroundColor Green
        }
        else {
            Write-Warning "Expected app to exit quickly, but it's still running."
        }
    }
    else {
        if ($proc.HasExited) {
            Write-Warning "App exited unexpectedly. Scenario may not be valid with current license/public key."
        }
    }

    Write-Host ""
    Write-Host "Manual checks:" -ForegroundColor Magenta
    foreach ($check in $ExpectedChecks) {
        Write-Host " - $check"
    }

    Read-Host "After verifying, press Enter to continue"
    Stop-App $proc
}

function Run-ScenarioExpiring([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
    Run-InteractiveScenario `
        -Name "AC1 - Expiring Banner (expires in 10 days)" `
        -Prepare { Set-LicenseJson -Signature $BaseSignature -ExpiresAt $expires } `
        -ExpectedChecks @(
            "Yellow warning banner is visible below header.",
            "Banner mentions: License expires in X days. Contact support to renew.",
            "Normal actions remain enabled (not read-only)."
        )
}

function Run-ScenarioGrace([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(-2).ToString("yyyy-MM-dd")
    Run-InteractiveScenario `
        -Name "AC2 - Grace Period Read-Only (expired 2 days ago)" `
        -Prepare { Set-LicenseJson -Signature $BaseSignature -ExpiresAt $expires } `
        -ExpectedChecks @(
            "Red error banner is visible with read-only message and remaining grace days.",
            "New GRN and New Batch buttons are disabled.",
            "GRN/Batch submit actions are disabled (read-only mode).",
            "Read-only pages/reads are still accessible."
        )
}

function Run-ScenarioExpired([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(-8).ToString("yyyy-MM-dd")
    Run-InteractiveScenario `
        -Name "AC2 - Full Expiry Lockout (expired 8 days ago)" `
        -Prepare { Set-LicenseJson -Signature $BaseSignature -ExpiresAt $expires } `
        -ExpectedChecks @(
            "Lockout screen shows: License Expired. Application is locked.",
            "Screen shows grace period ended guidance and hardware ID.",
            "Copy ID and Copy Support Message actions are available."
        )
}

function Run-ScenarioMismatch([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    $invalid = New-InvalidSignature
    Run-InteractiveScenario `
        -Name "AC3 - Hardware Mismatch Lockout Screen" `
        -Prepare { Set-LicenseJson -Signature $invalid -ExpiresAt $expires } `
        -ExpectedChecks @(
            "Lockout screen shows: Hardware ID Mismatch. Application is locked.",
            "A newly computed Hardware ID is displayed.",
            "Clicking Copy ID copies the displayed hardware ID."
        )
}

Assert-AppPath

if ($Mode -eq "reset") {
    Write-Step "Reset mode"
    Restore-LicenseFile
    return
}

$baseSignature = ""
Backup-LicenseFile
$baseSignature = Get-LicenseSignatureFromCurrentFile
Assert-Signature $baseSignature

try {
    switch ($Mode) {
        "expiring" { Run-ScenarioExpiring $baseSignature }
        "grace" { Run-ScenarioGrace $baseSignature }
        "expired" { Run-ScenarioExpired $baseSignature }
        "mismatch" { Run-ScenarioMismatch $baseSignature }
        "all" {
            Run-ScenarioExpiring $baseSignature
            Run-ScenarioGrace $baseSignature
            Run-ScenarioExpired $baseSignature
            Run-ScenarioMismatch $baseSignature
        }
    }
}
finally {
    if (-not $SkipRestore) {
        Write-Step "Restoring license"
        Restore-LicenseFile
    }
    else {
        Write-Warning "SkipRestore is enabled. license.key was not restored automatically."
    }
}

Write-Step "Done"
Write-Host "Manual license UX run complete."
Write-Host "If needed, restore manually with:"
Write-Host "  .\scripts\story-1-9-windows-license-ux-test.ps1 -Mode reset"
