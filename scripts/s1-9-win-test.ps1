param(
    [ValidateSet("all", "user-auto", "expiring", "grace", "expired", "mismatch", "reset")]
    [string]$Mode = "user-auto",
    [string]$ServerPath = "",
    [switch]$SkipRestore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LicensePath = Join-Path $RepoRoot "license.key"
$LicenseBackupPath = Join-Path $RepoRoot "license.key.story1_9_backup"
$DefaultServerBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$DefaultServerExe = Join-Path $RepoRoot "server.exe"

if ([string]::IsNullOrWhiteSpace($ServerPath)) {
    if (Test-Path $DefaultServerBuildExe) {
        $ServerPath = $DefaultServerBuildExe
    } elseif (Test-Path $DefaultServerExe) {
        $ServerPath = $DefaultServerExe
    }
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-ServerPath {
    if ([string]::IsNullOrWhiteSpace($ServerPath) -or -not (Test-Path $ServerPath)) {
        throw "Server executable not found. Provide -ServerPath or build first."
    }
}

function Backup-LicenseFile {
    if (-not (Test-Path $LicensePath)) {
        throw "license.key not found at: $LicensePath"
    }
    Copy-Item $LicensePath $LicenseBackupPath -Force
}

function Restore-LicenseFile {
    if (Test-Path $LicenseBackupPath) {
        Copy-Item $LicenseBackupPath $LicensePath -Force
    }
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
        $obj = $raw | ConvertFrom-Json
        $sig = [string]$obj.signature
        if ([string]::IsNullOrWhiteSpace($sig)) {
            throw "JSON license has no signature field."
        }
        return $sig.Trim()
    }

    return $raw
}

function Assert-Signature([string]$Signature) {
    if ($Signature.Length -ne 128) {
        throw "Expected 128 hex chars for signature, got length=$($Signature.Length)"
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

function Stop-AppProcess([System.Diagnostics.Process]$Process, [string]$Label) {
    if ($null -eq $Process) { return }
    if (-not $Process.HasExited) {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 400
        } catch {
            Write-Warning "Failed to stop $Label process $($Process.Id): $($_.Exception.Message)"
        }
    }
}

function Start-AppProcess([string]$Path, [string]$Label, [switch]$AllowImmediateExit) {
    Write-Step "Starting $Label"
    $proc = Start-Process -FilePath $Path -WorkingDirectory $RepoRoot -PassThru
    Start-Sleep -Seconds 4
    if ($proc.HasExited -and -not $AllowImmediateExit) {
        throw "$Label exited immediately. Path: $Path"
    }
    return $proc
}

function Get-UiTextSnapshot([int]$ProcessId = 0) {
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

    $root = [System.Windows.Automation.AutomationElement]::RootElement
    if ($null -eq $root) { return "" }

    $windows = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    $target = $null
    foreach ($window in $windows) {
        if ($ProcessId -gt 0 -and $window.Current.ProcessId -ne $ProcessId) { continue }
        $name = $window.Current.Name
        if ([string]::IsNullOrWhiteSpace($name)) { continue }
        if ($ProcessId -gt 0 -or $name -like "*Masala Inventory*") {
            $target = $window
            break
        }
    }

    if ($null -eq $target) { return "" }

    $names = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($target.Current.Name)) {
        $names.Add($target.Current.Name)
    }

    $desc = $target.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
    )
    foreach ($el in $desc) {
        $name = $el.Current.Name
        if (-not [string]::IsNullOrWhiteSpace($name)) {
            $names.Add($name)
        }
    }

    return ($names -join "`n")
}

function Wait-ForAnyUiText([string[]]$Patterns, [int]$TimeoutSeconds, [int]$ProcessId = 0) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $snapshot = Get-UiTextSnapshot -ProcessId $ProcessId
        foreach ($pattern in $Patterns) {
            if ($snapshot -match $pattern) { return $true }
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Invoke-LicenseScenario([string]$Name, [string]$Signature, [string]$ExpiresAt, [string[]]$ExpectedPatterns) {
    Write-Step $Name
    Set-LicenseJson -Signature $Signature -ExpiresAt $ExpiresAt

    $proc = $null
    try {
        $proc = Start-AppProcess $ServerPath "Server app ($Name)"
        $matched = Wait-ForAnyUiText $ExpectedPatterns 30 $proc.Id
        if (-not $matched) {
            throw "Expected UI symptom not found for scenario: $Name"
        }
        Write-Host "PASS: scenario detected expected UI symptom ($Name)." -ForegroundColor Green
    }
    finally {
        Stop-AppProcess $proc "Server app ($Name)"
    }
}

function Run-ScenarioExpiring([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
    Invoke-LicenseScenario "AC1-expiring" $BaseSignature $expires @(
        "License expires in",
        "Contact support to renew"
    )
}

function Run-ScenarioGrace([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(-2).ToString("yyyy-MM-dd")
    Invoke-LicenseScenario "AC2-grace" $BaseSignature $expires @(
        "Read-only mode active",
        "License Expired"
    )
}

function Run-ScenarioExpired([string]$BaseSignature) {
    $expires = (Get-Date).AddDays(-8).ToString("yyyy-MM-dd")
    Invoke-LicenseScenario "AC2-expired-lockout" $BaseSignature $expires @(
        "License Expired\. Application is locked",
        "grace period has ended"
    )
}

function Run-ScenarioMismatch {
    $expires = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    $invalid = New-InvalidSignature
    Invoke-LicenseScenario "AC3-hardware-mismatch" $invalid $expires @(
        "Hardware ID Mismatch\. Application is locked",
        "Machine ID"
    )
}

Assert-ServerPath

if ($Mode -eq "reset") {
    Write-Step "Reset mode"
    Restore-LicenseFile
    Write-Host "License restored from backup if present." -ForegroundColor Green
    exit 0
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
        "mismatch" { Run-ScenarioMismatch }
        "user-auto" {
            Run-ScenarioExpiring $baseSignature
            Run-ScenarioGrace $baseSignature
            Run-ScenarioExpired $baseSignature
            Run-ScenarioMismatch
        }
        "all" {
            Run-ScenarioExpiring $baseSignature
            Run-ScenarioGrace $baseSignature
            Run-ScenarioExpired $baseSignature
            Run-ScenarioMismatch
        }
        default {
            throw "Unsupported mode: $Mode"
        }
    }
}
finally {
    if (-not $SkipRestore) {
        Write-Step "Restoring license"
        Restore-LicenseFile
    } else {
        Write-Warning "SkipRestore enabled; license.key was not restored automatically."
    }
}

Write-Step "Done"
Write-Host "Story 1.9 automated validation complete." -ForegroundColor Green
