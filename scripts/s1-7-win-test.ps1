param(
    [ValidateSet("all", "auto", "reset")]
    [string]$Mode = "all",
    [string]$ServerPath = "",
    [string]$ClientPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DefaultServerBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$DefaultClientBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_client.exe"
$DefaultServerExe = Join-Path $RepoRoot "server.exe"
$DefaultClientExe = Join-Path $RepoRoot "client.exe"

if ([string]::IsNullOrWhiteSpace($ServerPath)) {
    if (Test-Path $DefaultServerBuildExe) {
        $ServerPath = $DefaultServerBuildExe
    } elseif (Test-Path $DefaultServerExe) {
        $ServerPath = $DefaultServerExe
    }
}
if ([string]::IsNullOrWhiteSpace($ClientPath)) {
    if (Test-Path $DefaultClientBuildExe) {
        $ClientPath = $DefaultClientBuildExe
    } elseif (Test-Path $DefaultClientExe) {
        $ClientPath = $DefaultClientExe
    }
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-AppPaths {
    if ([string]::IsNullOrWhiteSpace($ServerPath) -or -not (Test-Path $ServerPath)) {
        throw "Server executable not found. Provide -ServerPath or build first."
    }
    if ([string]::IsNullOrWhiteSpace($ClientPath) -or -not (Test-Path $ClientPath)) {
        throw "Client executable not found. Provide -ClientPath or build first."
    }
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
            if ($snapshot -match $pattern) {
                return $true
            }
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-ForUiText([string]$Pattern, [int]$TimeoutSeconds, [int]$ProcessId = 0) {
    return Wait-ForAnyUiText @($Pattern) $TimeoutSeconds $ProcessId
}

function Try-SetFirstEditValue([string]$Value, [int]$ProcessId = 0) {
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
    Add-Type -AssemblyName System.Windows.Forms

    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $windows = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    $target = $null
    foreach ($window in $windows) {
        if ($ProcessId -gt 0 -and $window.Current.ProcessId -ne $ProcessId) { continue }
        $name = $window.Current.Name
        if ($ProcessId -gt 0 -or $name -like "*Masala Inventory*") {
            $target = $window
            break
        }
    }
    if ($null -eq $target) { return $false }

    $editCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )

    $edits = $target.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
    if ($edits.Count -eq 0) { return $false }

    for ($i = 0; $i -lt $edits.Count; $i++) {
        $edit = $edits.Item($i)
        if (-not $edit.Current.IsEnabled) { continue }

        $vp = $null
        if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) {
            try {
                $vp.SetValue($Value)
                return $true
            } catch {
            }
        }

        try {
            $target.SetFocus()
            Start-Sleep -Milliseconds 150
            $edit.SetFocus()
            Start-Sleep -Milliseconds 150
            [System.Windows.Forms.SendKeys]::SendWait("^a")
            Start-Sleep -Milliseconds 100
            [System.Windows.Forms.SendKeys]::SendWait($Value)
            Start-Sleep -Milliseconds 150
            return $true
        } catch {
            continue
        }
    }

    return $false
}

function Run-NetworkRecoveryScenario {
    Write-Step "Connection recovery scenario"

    $server = $null
    $client = $null
    try {
        $server = Start-AppProcess $ServerPath "Server app"
        $client = Start-AppProcess $ClientPath "Client app"

        $connected = Wait-ForUiText "Connected" 30 $client.Id
        if (-not $connected) { throw "Client did not reach Connected state before interruption." }

        Stop-AppProcess $server "Server app"
        $server = $null

        $disconnected = Wait-ForAnyUiText @("Attempting to reconnect", "Disconnected", "Retrying:") 30 $client.Id
        if (-not $disconnected) { throw "Reconnect/disconnect symptom not detected after server stop." }

        $server = Start-AppProcess $ServerPath "Server app (restarted)"

        $recovered = Wait-ForUiText "Connected" 35 $client.Id
        if (-not $recovered) { throw "Client did not recover to Connected after server restart." }

        Write-Host "PASS: network recovery flow detected (disconnect -> reconnect)." -ForegroundColor Green
    }
    finally {
        Stop-AppProcess $client "Client app"
        Stop-AppProcess $server "Server app"
    }
}

function Run-DraftRecoveryScenario {
    Write-Step "Draft + reboot recovery scenario"

    $server = $null
    $client = $null
    try {
        $server = Start-AppProcess $ServerPath "Server app"
        $client = Start-AppProcess $ClientPath "Client app"

        $connected = Wait-ForUiText "Connected" 30 $client.Id
        if (-not $connected) { throw "Client did not reach Connected state before draft test." }

        $seeded = Try-SetFirstEditValue ("S1-7-Draft-{0}" -f (Get-Date -Format "HHmmss")) $client.Id
        if (-not $seeded) {
            Write-Warning "Could not seed form field automatically. Resume-draft signal may not appear."
        }

        Start-Sleep -Seconds 7
        Stop-AppProcess $client "Client app"

        $client = Start-AppProcess $ClientPath "Client app (restarted)"
        $resumePrompt = Wait-ForUiText "Resume draft" 30 $client.Id
        if (-not $resumePrompt) {
            throw "Resume draft prompt not detected after client restart."
        }

        Write-Host "PASS: draft recovery prompt detected after client restart." -ForegroundColor Green
    }
    finally {
        Stop-AppProcess $client "Client app"
        Stop-AppProcess $server "Server app"
    }
}

function Run-Auto {
    Assert-AppPaths
    Run-NetworkRecoveryScenario
    Run-DraftRecoveryScenario
}

Push-Location $RepoRoot
try {
    switch ($Mode) {
        "auto" { Run-Auto }
        "all" { Run-Auto }
        "reset" {
            Write-Step "Reset mode"
            Write-Host "No Story 1.7 artifacts to reset." -ForegroundColor DarkGray
        }
        default { throw "Unsupported mode: $Mode" }
    }

    if ($Mode -ne "reset") {
        Write-Step "Done"
        Write-Host "Story 1.7 validation complete." -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
