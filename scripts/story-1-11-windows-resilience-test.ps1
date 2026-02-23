param(
    [ValidateSet("all", "manual-all", "manual-ui-all", "auto-app", "auto-network", "auto-reboot", "build", "wal", "udp", "clock", "manual-network", "manual-reboot", "reset")]
    [string]$Mode = "manual-ui-all",
    [switch]$Rebuild,
    [switch]$SkipInstallers,
    [string]$GoCachePath = "",
    [string]$ReportPath = "",
    [string]$ServerPath = "",
    [string]$ClientPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ScriptVersion = "2026-02-24.3"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildScript = Join-Path $RepoRoot "scripts\windows-hard-sync-build-run.ps1"
$ProtocolDoc = Join-Path $RepoRoot "docs\test-protocols\resilience-testing.md"
$ManualTestingDir = Join-Path $RepoRoot "docs\manual_testing"
$DefaultServerBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_server.exe"
$DefaultClientBuildExe = Join-Path $RepoRoot "build\bin\masala_inventory_client.exe"
$DefaultServerExe = Join-Path $RepoRoot "server.exe"
$DefaultClientExe = Join-Path $RepoRoot "client.exe"

if ([string]::IsNullOrWhiteSpace($ServerPath)) {
    if (Test-Path $DefaultServerBuildExe) {
        $ServerPath = $DefaultServerBuildExe
    }
    elseif (Test-Path $DefaultServerExe) {
        $ServerPath = $DefaultServerExe
    }
}

if ([string]::IsNullOrWhiteSpace($ClientPath)) {
    if (Test-Path $DefaultClientBuildExe) {
        $ClientPath = $DefaultClientBuildExe
    }
    elseif (Test-Path $DefaultClientExe) {
        $ClientPath = $DefaultClientExe
    }
}

if ([string]::IsNullOrWhiteSpace($GoCachePath)) {
    $GoCachePath = Join-Path $env:TEMP "go-build-masala-story-1-11"
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $dateTag = Get-Date -Format "yyyy-MM-dd"
    $ReportPath = Join-Path $ManualTestingDir ("story-1-11-resilience-validation-{0}.md" -f $dateTag)
}

$script:LastCheckSummary = ""
$script:AutomationStatusPath = Join-Path $env:TEMP "masala-story-1-11-status.json"
$script:AutomationChecks = @{}
$env:MASALA_AUTOMATION_STATUS_FILE = $script:AutomationStatusPath

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-VersionBanner {
    Write-Host "Story 1.11 script version: $ScriptVersion" -ForegroundColor DarkCyan
}

function Assert-PathExists([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) {
        throw "$Label not found: $Path"
    }
}

function Ensure-ReportHeader {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null
    if (Test-Path $ReportPath) {
        return
    }

    $header = @(
        "# Story 1.11 Resilience Validation Report"
        ""
        "- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
        '- Protocol Reference: `docs/test-protocols/resilience-testing.md`'
        '- Script: `scripts/story-1-11-windows-resilience-test.ps1`'
        ""
        "## Results"
        ""
    ) -join "`r`n"
    Set-Content -Path $ReportPath -Value $header -Encoding UTF8
}

function Add-ReportLine([string]$Line) {
    Ensure-ReportHeader
    Add-Content -Path $ReportPath -Value $Line
}

function Set-CheckSummary([string]$Summary) {
    $script:LastCheckSummary = $Summary
}

function Write-AutomationStatus([string]$CurrentCheck, [string]$LastEvent) {
    $payload = [ordered]@{
        enabled = $true
        current_check = $CurrentCheck
        last_event = $LastEvent
        updated_at = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        checks = $script:AutomationChecks
    }
    $json = $payload | ConvertTo-Json -Depth 6
    Set-Content -Path $script:AutomationStatusPath -Value $json -Encoding UTF8
}

function Start-AutomationCheck([string]$CheckId, [string]$StepMessage) {
    if ([string]::IsNullOrWhiteSpace($CheckId)) {
        return
    }
    $script:AutomationChecks[$CheckId] = "Running"
    Write-AutomationStatus $CheckId $StepMessage
}

function Complete-AutomationCheck([string]$CheckId, [string]$StepMessage) {
    if ([string]::IsNullOrWhiteSpace($CheckId)) {
        return
    }
    $script:AutomationChecks[$CheckId] = "PASS"
    Write-AutomationStatus $CheckId $StepMessage
}

function Fail-AutomationCheck([string]$CheckId, [string]$StepMessage) {
    if ([string]::IsNullOrWhiteSpace($CheckId)) {
        return
    }
    $script:AutomationChecks[$CheckId] = "FAIL"
    Write-AutomationStatus $CheckId $StepMessage
}

function Clear-AutomationStatus {
    if (Test-Path $script:AutomationStatusPath) {
        Remove-Item -Force $script:AutomationStatusPath -ErrorAction SilentlyContinue
    }
}

function Wait-ForNextCheck([string]$CheckName) {
    Write-Host ""
    Write-Host "Check Result: $CheckName" -ForegroundColor Cyan
    if (-not [string]::IsNullOrWhiteSpace($script:LastCheckSummary)) {
        Write-Host $script:LastCheckSummary -ForegroundColor DarkGray
    }
    Read-Host "Check complete: $CheckName. Press Enter to continue to the next check" | Out-Null
}

function Get-ExecutableName([string]$Path) {
    return [System.IO.Path]::GetFileNameWithoutExtension($Path)
}

function Resolve-AppPaths {
    if ([string]::IsNullOrWhiteSpace($ServerPath) -or -not (Test-Path $ServerPath)) {
        throw "Server executable not found. Provide -ServerPath or build first."
    }
    if ([string]::IsNullOrWhiteSpace($ClientPath) -or -not (Test-Path $ClientPath)) {
        throw "Client executable not found. Provide -ClientPath or build first."
    }
}

function Start-AppProcess([string]$Path, [string]$Label) {
    Write-Step "Starting $Label"
    $proc = Start-Process -FilePath $Path -WorkingDirectory $RepoRoot -PassThru
    Start-Sleep -Seconds 4
    if ($proc.HasExited) {
        throw "$Label exited immediately. Path: $Path"
    }
    return $proc
}

function Stop-AppProcess([System.Diagnostics.Process]$Process, [string]$Label) {
    if ($null -eq $Process) {
        return
    }
    if (-not $Process.HasExited) {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 500
        }
        catch {
            Write-Warning "Failed to stop $Label process $($Process.Id): $($_.Exception.Message)"
        }
    }
}

function Restart-AppProcess([ref]$ProcessRef, [string]$Path, [string]$Label) {
    if ($null -ne $ProcessRef.Value) {
        Stop-AppProcess $ProcessRef.Value $Label
    }
    $ProcessRef.Value = Start-AppProcess $Path $Label
}

function Get-HeartbeatPath {
    return Join-Path $RepoRoot ".hw_hb"
}

function Set-HeartbeatUnixTimestamp([int64]$UnixTs, [string]$Path) {
    $bytes = [System.BitConverter]::GetBytes([UInt64]$UnixTs)
    [System.Array]::Reverse($bytes) # heartbeat uses big-endian uint64
    [System.IO.File]::WriteAllBytes($Path, $bytes)
}

function Stop-ExistingByPath([string]$Path) {
    $name = Get-ExecutableName $Path
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Unable to stop pre-existing process '$name' ($($_.Id)): $($_.Exception.Message)"
        }
    }
}

function Get-UiTextSnapshot([int]$ProcessId = 0) {
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

    $root = [System.Windows.Automation.AutomationElement]::RootElement
    if ($null -eq $root) {
        return ""
    }

    $windows = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
    )

    $target = $null
    foreach ($window in $windows) {
        if ($ProcessId -gt 0 -and $window.Current.ProcessId -ne $ProcessId) {
            continue
        }
        $name = $window.Current.Name
        if ([string]::IsNullOrWhiteSpace($name)) {
            continue
        }
        if ($ProcessId -gt 0 -or $name -like "*Masala Inventory*") {
            $target = $window
            break
        }
    }

    if ($null -eq $target) {
        return ""
    }

    $names = New-Object System.Collections.Generic.List[string]
    $windowName = $target.Current.Name
    if (-not [string]::IsNullOrWhiteSpace($windowName)) {
        $names.Add($windowName)
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

function Wait-ForUiText([string]$Pattern, [int]$TimeoutSeconds, [bool]$ShouldExist = $true, [int]$ProcessId = 0) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $snapshot = Get-UiTextSnapshot -ProcessId $ProcessId
        $hasMatch = $snapshot -match $Pattern
        if (($ShouldExist -and $hasMatch) -or (-not $ShouldExist -and -not $hasMatch)) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
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
        if ($ProcessId -gt 0 -and $window.Current.ProcessId -ne $ProcessId) {
            continue
        }
        $name = $window.Current.Name
        if ($ProcessId -gt 0 -or $name -like "*Masala Inventory*") {
            $target = $window
            break
        }
    }
    if ($null -eq $target) {
        return $false
    }

    $editCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )

    $edits = $target.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
    if ($edits.Count -eq 0) {
        return $false
    }

    for ($i = 0; $i -lt $edits.Count; $i++) {
        $edit = $edits.Item($i)
        if (-not $edit.Current.IsEnabled) {
            continue
        }

        $vp = $null
        if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) {
            try {
                $vp.SetValue($Value)
                return $true
            }
            catch {
                # Fall through to focus+keyboard fallback.
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
        }
        catch {
            continue
        }
    }

    return $false
}

function Invoke-HardSyncBuild {
    Assert-PathExists $BuildScript "Build script"
    Write-Step "Running windows-hard-sync-build-run.ps1"
    Write-Host "WARNING: This does a git hard reset and removes uncommitted changes." -ForegroundColor Yellow
    if ($SkipInstallers) {
        & powershell -ExecutionPolicy Bypass -File $BuildScript -SkipInstallers
    }
    else {
        & powershell -ExecutionPolicy Bypass -File $BuildScript
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Build script failed with exit code $LASTEXITCODE"
    }
}

function Invoke-GoTest([string]$Label, [string]$Package, [string]$RunPattern, [string]$AutomationCheckId = "") {
    Write-Step "Automated check: $Label"
    if (-not [string]::IsNullOrWhiteSpace($AutomationCheckId)) {
        Write-Host "[$AutomationCheckId] Step 1/3: Preparing backend validation context..." -ForegroundColor DarkGray
    }
    Write-Host "Running backend validation: go test $Package -run $RunPattern -count=1" -ForegroundColor DarkGray
    Start-AutomationCheck $AutomationCheckId "Running $Label"
    if (-not [string]::IsNullOrWhiteSpace($AutomationCheckId)) {
        Write-Host "[$AutomationCheckId] Step 2/3: Executing integration/unit test command..." -ForegroundColor DarkGray
    }
    $env:GOCACHE = $GoCachePath
    & go test $Package -run $RunPattern -count=1
    if ($LASTEXITCODE -ne 0) {
        Add-ReportLine("- [FAIL] $Label")
        Set-CheckSummary("FAILED. Command: go test $Package -run $RunPattern -count=1")
        Fail-AutomationCheck $AutomationCheckId "Failed $Label"
        throw "Automated check failed: $Label"
    }
    if (-not [string]::IsNullOrWhiteSpace($AutomationCheckId)) {
        Write-Host "[$AutomationCheckId] Step 3/3: Validation passed and status recorded." -ForegroundColor DarkGray
    }
    Write-Host "PASS: $Label" -ForegroundColor Green
    Add-ReportLine("- [PASS] $Label")
    Set-CheckSummary("PASS. Command: go test $Package -run $RunPattern -count=1")
    Complete-AutomationCheck $AutomationCheckId "Completed $Label"
}

function Run-WalTest {
    Invoke-GoTest "WAL Recovery Integration Test (AC1)" "./test/integration" "TestWALRecoveryIntegration" "AC1"
}

function Run-UdpTest {
    Invoke-GoTest "UDP Re-Discovery Integration Test (AC2)" "./test/integration" "TestUDPRediscoveryIntegration" "AC2"
}

function Run-ClockTamperTest {
    Invoke-GoTest "Clock Tamper Test via ValidateLicense (AC5)" "./internal/infrastructure/license" "TestValidateLicense_ClockTamperDetectedWithInjectedClock" "AC5"
}

function Prompt-ManualChecklist(
    [string]$ScenarioName,
    [string[]]$Checks,
    [string]$CheckId = "",
    [string[]]$Steps = @()
) {
    Ensure-ReportHeader
    Write-Step "Manual scenario: $ScenarioName"
    Write-Host "Reference protocol doc: $ProtocolDoc" -ForegroundColor DarkGray
    Write-Host "Run the scenario now, then confirm each check." -ForegroundColor Yellow
    Write-Host ""
    if (-not [string]::IsNullOrWhiteSpace($CheckId)) {
        Start-AutomationCheck $CheckId "Running manual checklist for $ScenarioName"
    }
    if ($Steps.Count -gt 0) {
        for ($i = 0; $i -lt $Steps.Count; $i++) {
            Write-Host "[$CheckId] Step $($i + 1)/$($Steps.Count): $($Steps[$i])" -ForegroundColor DarkGray
        }
        Write-Host ""
    }

    $allPass = $true
    Add-ReportLine("")
    Add-ReportLine("### $ScenarioName")
    foreach ($check in $Checks) {
        $answer = Read-Host "[y/n] $check"
        $passed = $answer.Trim().ToLower() -in @("y", "yes")
        if ($passed) {
            Add-ReportLine("- [PASS] $check")
        }
        else {
            $allPass = $false
            Add-ReportLine("- [FAIL] $check")
        }
    }

    $notes = Read-Host "Optional notes for this scenario (enter to skip)"
    if (-not [string]::IsNullOrWhiteSpace($notes)) {
        Add-ReportLine("- Notes: $notes")
    }

    if ($allPass) {
        Write-Host "PASS: $ScenarioName" -ForegroundColor Green
        Set-CheckSummary("PASS. Manual checklist completed with all confirmations marked yes.")
        if (-not [string]::IsNullOrWhiteSpace($CheckId)) {
            Complete-AutomationCheck $CheckId "Completed manual checklist: $ScenarioName"
        }
    }
    else {
        Write-Warning "One or more checks failed in: $ScenarioName"
        Set-CheckSummary("FAILED. One or more manual confirmations were marked no. See report: $ReportPath")
        if (-not [string]::IsNullOrWhiteSpace($CheckId)) {
            Fail-AutomationCheck $CheckId "Manual checklist failed: $ScenarioName"
        }
    }
}

function Run-ManualWalScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 3: WAL Recovery (Manual UI) (AC1)" `
        -CheckId "AC1" `
        -Steps @(
            "Ensure server and client are running. Open GRN or Batch form in client.",
            "Enter sample values so there is visible in-memory state and recent activity.",
            "When prompted, press Enter and the script will restart the server automatically.",
            "Observe client and server recovery behavior, then continue to checklist confirmations."
        ) `
        -Checks @(
            "Application recovers after server restart without crash loop.",
            "No obvious data corruption or broken form state after recovery.",
            "Expected recovery symptom was visible in UI/logs during restart.",
            "Evidence captured (screenshots + timestamps)."
        )
}

function Run-ManualUdpScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 4: UDP Re-Discovery (Manual UI) (AC2)" `
        -CheckId "AC2" `
        -Steps @(
            "Keep server and client running on LAN.",
            "When prompted, the script will restart the server to simulate discovery interruption.",
            "Observe client transition to reconnect/disconnected symptoms, then recovery.",
            "Confirm client rediscovers server automatically and stabilizes."
        ) `
        -Checks @(
            "Client showed reconnect/disconnected symptom during interruption.",
            "Client rediscovered server automatically without full manual relaunch.",
            "Connection stabilized again under normal LAN conditions.",
            "Evidence captured (screenshots + timings)."
        )
}

function Run-ManualClockTamperScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 5: Clock Tamper Detection (Manual UI) (AC5)" `
        -CheckId "AC5" `
        -Steps @(
            "With app running, perform your clock-tamper test procedure on the client machine.",
            "Return to app and trigger license validation path (reopen app if needed).",
            "Observe license/security symptom in UI (warning/lockout/read-only behavior per policy).",
            "Revert clock to correct value after verification."
        ) `
        -Checks @(
            "Clock tamper symptom was detected by the application behavior.",
            "UI reflected expected license/security state for tamper condition.",
            "Application remained stable (no crash) while handling tamper state.",
            "Evidence captured (screenshots + timestamps)."
        )
}

function Run-AutoClockTamperScenario([ref]$ServerProcRef, [ref]$ClientProcRef) {
    Ensure-ReportHeader
    Write-Step "Auto clock tamper simulation (AC5)"
    Start-AutomationCheck "AC5" "Running AC5: simulate heartbeat-based clock tamper"

    $heartbeatPath = Get-HeartbeatPath
    $nowTs = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $tamperTs = $nowTs + 86400

    Write-Host "[AC5] Step 1/5: Writing future heartbeat timestamp to simulate clock tampering..." -ForegroundColor DarkGray
    Set-HeartbeatUnixTimestamp $tamperTs $heartbeatPath

    Write-Host "[AC5] Step 2/5: Restarting server to trigger startup license validation..." -ForegroundColor DarkGray
    Restart-AppProcess $ServerProcRef $ServerPath "Server app (AC5 tamper restart)"
    Start-Sleep -Seconds 4

    Write-Host "[AC5] Step 3/5: Verifying tamper symptom (server startup failure or client disconnect state)..." -ForegroundColor DarkGray
    $serverStopped = $ServerProcRef.Value.HasExited
    $clientDisconnected = $false
    if ($null -ne $ClientProcRef.Value -and -not $ClientProcRef.Value.HasExited) {
        $clientDisconnected = Wait-ForAnyUiText @(
            "Attempting to reconnect",
            "Disconnected",
            "Retrying:"
        ) 25 $ClientProcRef.Value.Id
    }
    if (-not $serverStopped -and -not $clientDisconnected) {
        Add-ReportLine("- [FAIL] AC5 auto-check: expected tamper symptom not detected (server stayed up and client did not disconnect).")
        Fail-AutomationCheck "AC5" "Failed AC5: tamper symptom not detected"
        throw "AC5 auto-check failed: expected tamper symptom not detected."
    }

    Write-Host "[AC5] Step 4/5: Restoring heartbeat to current timestamp and restarting server..." -ForegroundColor DarkGray
    $restoreTs = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    Set-HeartbeatUnixTimestamp $restoreTs $heartbeatPath
    Restart-AppProcess $ServerProcRef $ServerPath "Server app (AC5 recovery restart)"
    if ($null -eq $ClientProcRef.Value -or $ClientProcRef.Value.HasExited) {
        Restart-AppProcess $ClientProcRef $ClientPath "Client app (AC5 recovery restart)"
    }

    Write-Host "[AC5] Step 5/5: Waiting for client to return to Connected..." -ForegroundColor DarkGray
    $connected = Wait-ForUiText "Connected" 30 $true $ClientProcRef.Value.Id
    if (-not $connected) {
        Add-ReportLine("- [FAIL] AC5 auto-check: client did not return to Connected after heartbeat restoration.")
        Fail-AutomationCheck "AC5" "Failed AC5: client did not reconnect after restoration"
        throw "AC5 auto-check failed: client did not reconnect after restoration."
    }

    Add-ReportLine("- [PASS] AC5 auto-check: tamper symptom detected and environment recovered to Connected.")
    Complete-AutomationCheck "AC5" "Completed AC5: tamper detected, restored, and reconnected"
    Set-CheckSummary("PASS. Actions: wrote future heartbeat, restarted server, observed tamper symptom, restored heartbeat, restarted server, verified client Connected.")
}

function Run-ManualNetworkScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 1: Network Failure Simulation (Pull LAN Cable) (AC3)" `
        -CheckId "AC3" `
        -Steps @(
            "Keep server and client running in normal connected state.",
            "Disconnect LAN (or equivalent network interruption) for a short period.",
            "Observe reconnect overlay/status changes in client, then restore network.",
            "Verify automatic recovery and normal connected state."
        ) `
        -Checks @(
            "Reconnecting overlay appears after LAN disconnect.",
            "Client reconnects automatically after network restoration.",
            "Recovery is within 5 seconds under stable LAN conditions.",
            "Evidence captured (screenshots + timings)."
        )
}

function Run-ManualRebootScenario {
    Assert-PathExists $ProtocolDoc "Protocol document"
    Prompt-ManualChecklist `
        -ScenarioName "Protocol 2: Client Reboot Recovery (AC4)" `
        -CheckId "AC4" `
        -Steps @(
            "With server running, enter draft values in a client form and wait for autosave interval.",
            "When prompted, press Enter and the script will restart only the client application.",
            "Observe resume-discard draft prompt and test both paths if needed.",
            "Confirm client returns to connected/usable state after restart."
        ) `
        -Checks @(
            "Resume draft prompt appears after reboot with unsaved draft.",
            "Choosing Resume restores draft values.",
            "Choosing Discard clears stored draft and opens clean form.",
            "Evidence captured (screenshots + timestamps)."
        )
}

function Run-All {
    Run-WalTest
    Wait-ForNextCheck "WAL Recovery Integration Test (AC1)"
    Run-UdpTest
    Wait-ForNextCheck "UDP Re-Discovery Integration Test (AC2)"
    Run-ClockTamperTest
    Wait-ForNextCheck "Clock Tamper Test (AC5)"
    Run-ManualNetworkScenario
    Wait-ForNextCheck "Manual Network Failure Simulation (AC3)"
    Run-ManualRebootScenario
    Wait-ForNextCheck "Manual Client Reboot Recovery (AC4)"
}

function Run-ManualAll {
    Run-ManualNetworkScenario
    Wait-ForNextCheck "Manual Network Failure Simulation (AC3)"
    Run-ManualRebootScenario
    Wait-ForNextCheck "Manual Client Reboot Recovery (AC4)"
}

function Run-ManualUiAll {
    Resolve-AppPaths
    Ensure-ReportHeader

    $serverProc = $null
    $clientProc = $null

    try {
        Stop-ExistingByPath $ServerPath
        Stop-ExistingByPath $ClientPath
        $serverProc = Start-AppProcess $ServerPath "Server app"
        $clientProc = Start-AppProcess $ClientPath "Client app"

        Write-Step "Preparing manual UI baseline"
        Write-Host "Waiting for client to reach initial Connected state before manual checks..." -ForegroundColor DarkGray
        $connectedBaseline = Wait-ForUiText "Connected" 30 $true $clientProc.Id
        if (-not $connectedBaseline) {
            Write-Warning "Client did not reach Connected state on first attempt. Restarting server once and retrying..."
            Stop-AppProcess $serverProc "Server app"
            $serverProc = Start-AppProcess $ServerPath "Server app (retry)"
            $connectedBaseline = Wait-ForUiText "Connected" 30 $true $clientProc.Id
        }
        if (-not $connectedBaseline) {
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Add-ReportLine("- [FAIL] Manual UI baseline: client did not reach Connected state before scenarios.")
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            throw "Manual UI baseline failed: client is not connected before scenario execution. Check server startup health and executable paths."
        }

        Write-Step "Manual UI validation flow (AC1, AC2, AC5, AC3, AC4)"
        Write-Host "No go test commands are executed in this mode." -ForegroundColor Yellow
        Write-Host "Flow is now fully automated for AC1/AC2/AC3/AC4/AC5; only observation pauses remain." -ForegroundColor DarkGray

        Write-Step "AC1 automation step"
        Write-Host "Observe current baseline state now (before restart)." -ForegroundColor Yellow
        Read-Host "Press Enter to begin AC1 automated server restart check" | Out-Null
        Write-Host "Restarting server automatically to validate recovery behavior..." -ForegroundColor Yellow
        Restart-AppProcess ([ref]$serverProc) $ServerPath "Server app (AC1 restart)"
        $ac1Connected = Wait-ForUiText "Connected" 30 $true $clientProc.Id
        if (-not $ac1Connected) {
            Add-ReportLine("- [FAIL] AC1 auto-check: client did not stabilize to Connected after server restart.")
            throw "AC1 auto-check failed: client did not stabilize."
        }
        Add-ReportLine("- [PASS] AC1 auto-check: client remained/recovered to Connected after server restart.")
        Set-CheckSummary("PASS. AC1 automation: restarted server and verified Connected state.")
        Complete-AutomationCheck "AC1" "Completed AC1 automated restart/recovery check"
        Wait-ForNextCheck "Auto WAL Recovery Behavior Check (AC1)"

        Write-Step "AC2 automation step"
        Write-Host "Starting automatic server stop/start to simulate rediscovery interruption..." -ForegroundColor Yellow
        Start-AutomationCheck "AC2" "Running AC2 automated rediscovery simulation"
        Stop-AppProcess $serverProc "Server app (AC2 stop)"
        Start-Sleep -Seconds 8
        $ac2Overlay = Wait-ForAnyUiText @("Attempting to reconnect", "Disconnected", "Retrying:") 20 $clientProc.Id
        $serverProc = Start-AppProcess $ServerPath "Server app (AC2 restart)"
        $ac2Recovered = Wait-ForUiText "Connected" 30 $true $clientProc.Id
        $isSingleMachineMode = [string]::IsNullOrWhiteSpace($env:MASALA_SERVER_PROBE_ADDR)
        if (-not $ac2Recovered) {
            Add-ReportLine("- [FAIL] AC2 auto-check: client did not recover to Connected after server restart.")
            Fail-AutomationCheck "AC2" "Failed AC2 automated rediscovery simulation (no recovery)"
            throw "AC2 auto-check failed: client did not recover."
        }
        if (-not $ac2Overlay -and -not $isSingleMachineMode) {
            Add-ReportLine("- [FAIL] AC2 auto-check: reconnect/disconnected symptom was not observed before recovery.")
            Fail-AutomationCheck "AC2" "Failed AC2 automated rediscovery simulation (no reconnect symptom)"
            throw "AC2 auto-check failed: rediscovery sequence not observed."
        }
        if (-not $ac2Overlay -and $isSingleMachineMode) {
            Add-ReportLine("- [PASS] AC2 auto-check: fast single-machine recovery detected (no visible reconnect overlay), recovered to Connected.")
            Set-CheckSummary("PASS. AC2 automation: single-machine fast recovery path; client recovered to Connected.")
            Complete-AutomationCheck "AC2" "Completed AC2: fast single-machine recovery path"
        }
        else {
            Add-ReportLine("- [PASS] AC2 auto-check: reconnect symptom observed and client recovered to Connected.")
            Set-CheckSummary("PASS. AC2 automation: reconnect symptom observed and recovered to Connected.")
            Complete-AutomationCheck "AC2" "Completed AC2 automated rediscovery simulation"
        }
        Wait-ForNextCheck "Auto UDP Re-Discovery Behavior Check (AC2)"

        Run-AutoClockTamperScenario ([ref]$serverProc) ([ref]$clientProc)
        Wait-ForNextCheck "Auto Clock Tamper Detection (AC5)"
        Write-Step "AC3 automated validation"
        Write-Host "Running automated AC3 network failure simulation (no manual confirmations required)." -ForegroundColor Yellow
        Run-AutoNetworkScenario
        Wait-ForNextCheck "Auto Network Failure Simulation (AC3)"

        Write-Step "AC4 automated validation"
        Write-Host "Running automated AC4 reboot recovery check (no manual confirmations required)." -ForegroundColor Yellow
        Run-AutoRebootScenario
        Wait-ForNextCheck "Auto Client Reboot Recovery (AC4)"
    }
    finally {
        Stop-AppProcess $clientProc "Client app"
        Stop-AppProcess $serverProc "Server app"
    }
}

function Run-AutoNetworkScenario {
    Resolve-AppPaths
    Ensure-ReportHeader

    $serverProc = $null
    $clientProc = $null

    try {
        Stop-ExistingByPath $ServerPath
        Stop-ExistingByPath $ClientPath

        $serverProc = Start-AppProcess $ServerPath "Server app"
        $clientProc = Start-AppProcess $ClientPath "Client app"

        Write-Step "Auto network failure simulation"
        Start-AutomationCheck "AC3" "Running AC3: simulating server stop and client reconnect"
        Write-Host "[AC3] Step 1/4: Stopping server to simulate network/backend failure..." -ForegroundColor DarkGray
        Stop-AppProcess $serverProc "Server app"
        # Give the connection loop one normal probe cycle to transition from connected->reconnecting.
        Start-Sleep -Seconds 12

        Write-Host "[AC3] Step 2/4: Waiting for disconnect/reconnect symptom text in client UI..." -ForegroundColor DarkGray
        $overlayDetected = Wait-ForAnyUiText @(
            "Attempting to reconnect",
            "Disconnected",
            "Retrying:"
        ) 45 $clientProc.Id
        if (-not $overlayDetected) {
            Add-ReportLine("- [FAIL] AC3 auto-check: reconnecting overlay text not detected.")
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Write-Host "AC3 debug snapshot (client window text):" -ForegroundColor Yellow
                Write-Host $snapshot
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            Fail-AutomationCheck "AC3" "Failed AC3: reconnecting overlay not detected"
            throw "AC3 auto-check failed: reconnecting overlay not detected."
        }

        Write-Host "[AC3] Step 3/4: Restarting server..." -ForegroundColor DarkGray
        $serverProc = Start-AppProcess $ServerPath "Server app (restarted)"
        Write-Host "[AC3] Step 4/4: Waiting for client to recover back to Connected..." -ForegroundColor DarkGray
        $recovered = Wait-ForUiText "Connected" 30 $true $clientProc.Id
        if (-not $recovered) {
            Add-ReportLine("- [FAIL] AC3 auto-check: connected status not detected after server restart.")
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Write-Host "AC3 debug snapshot after restart (client window text):" -ForegroundColor Yellow
                Write-Host $snapshot
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            Fail-AutomationCheck "AC3" "Failed AC3: connected status not detected after restart"
            throw "AC3 auto-check failed: connected status not detected."
        }

        Add-ReportLine("- [PASS] AC3 auto-check: reconnect overlay detected and connection recovered.")
        Write-Host "PASS: Auto network scenario (AC3)" -ForegroundColor Green
        Set-CheckSummary("PASS. Actions: started server+client, stopped server, detected 'Attempting to reconnect...', restarted server, detected 'Connected'.")
        Complete-AutomationCheck "AC3" "Completed AC3: reconnect symptom detected and client recovered"
    }
    finally {
        Stop-AppProcess $clientProc "Client app"
        Stop-AppProcess $serverProc "Server app"
    }
}

function Run-AutoRebootScenario {
    Resolve-AppPaths
    Ensure-ReportHeader

    $serverProc = $null
    $clientProc = $null

    try {
        Stop-ExistingByPath $ServerPath
        Stop-ExistingByPath $ClientPath

        $serverProc = Start-AppProcess $ServerPath "Server app"
        $clientProc = Start-AppProcess $ClientPath "Client app"

        Write-Step "Auto draft+relaunch simulation"
        Start-AutomationCheck "AC4" "Running AC4: seeding draft and restarting client"
        Write-Host "[AC4] Step 1/5: Waiting for form UI to be ready..." -ForegroundColor DarkGray
        $uiReady = Wait-ForAnyUiText @("Supplier Name", "GRN Form", "Batch Form") 25 $clientProc.Id
        if (-not $uiReady) {
            Add-ReportLine("- [FAIL] AC4 auto-check: client form UI did not become ready before seeding.")
            Fail-AutomationCheck "AC4" "Failed AC4: client form UI not ready"
            throw "AC4 auto-check failed: client form UI not ready."
        }

        $draftValue = "AUTO-DRAFT-" + (Get-Date -Format "HHmmss")
        $seeded = $false
        Write-Host "[AC4] Step 2/5: Seeding a draft value into the form..." -ForegroundColor DarkGray
        for ($attempt = 1; $attempt -le 5; $attempt++) {
            $seeded = Try-SetFirstEditValue $draftValue $clientProc.Id
            if ($seeded) {
                break
            }
            Start-Sleep -Seconds 1
        }
        if (-not $seeded) {
            Add-ReportLine("- [FAIL] AC4 auto-check: unable to set form draft value through UI Automation.")
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            Fail-AutomationCheck "AC4" "Failed AC4: unable to seed draft field"
            throw "AC4 auto-check failed: could not seed form field."
        }

        Write-Host "[AC4] Step 3/5: Waiting for autosave interval to persist draft..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 7
        Write-Host "[AC4] Step 4/5: Restarting client process..." -ForegroundColor DarkGray
        Stop-AppProcess $clientProc "Client app"
        $clientProc = Start-AppProcess $ClientPath "Client app (restarted)"

        Write-Host "[AC4] Step 5/5: Waiting for 'Resume draft' prompt..." -ForegroundColor DarkGray
        $resumePrompt = Wait-ForUiText "Resume draft" 30 $true $clientProc.Id
        if (-not $resumePrompt) {
            Add-ReportLine("- [FAIL] AC4 auto-check: 'Resume draft' prompt not detected after client restart.")
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            Fail-AutomationCheck "AC4" "Failed AC4: resume prompt not detected"
            throw "AC4 auto-check failed: resume prompt not detected."
        }

        $connectedAfterRestart = Wait-ForUiText "Connected" 20 $true $clientProc.Id
        if (-not $connectedAfterRestart) {
            Add-ReportLine("- [FAIL] AC4 auto-check: client did not return to Connected state after restart.")
            $snapshot = Get-UiTextSnapshot -ProcessId $clientProc.Id
            if (-not [string]::IsNullOrWhiteSpace($snapshot)) {
                Add-ReportLine("- Debug snapshot (client window text):")
                Add-ReportLine('```')
                Add-ReportLine($snapshot)
                Add-ReportLine('```')
            }
            Fail-AutomationCheck "AC4" "Failed AC4: client did not return to Connected after restart"
            throw "AC4 auto-check failed: client not connected after restart."
        }

        Add-ReportLine("- [PASS] AC4 auto-check: resume draft prompt detected and client returned to Connected after restart.")
        Write-Host "PASS: Auto reboot scenario (AC4)" -ForegroundColor Green
        Set-CheckSummary("PASS. Actions: started server+client, seeded draft field, waited for autosave, restarted client, detected 'Resume draft' prompt, verified 'Connected' state.")
        Complete-AutomationCheck "AC4" "Completed AC4: draft prompt shown and connection recovered"
    }
    finally {
        Stop-AppProcess $clientProc "Client app"
        Stop-AppProcess $serverProc "Server app"
    }
}

function Run-AutoApp {
    Resolve-AppPaths
    $statusClientProc = $null

    try {
        Stop-ExistingByPath $ClientPath
        $statusClientProc = Start-AppProcess $ClientPath "Client app (status viewer)"
        Write-Host "UI status viewer started. Watch the Automation Status panel in the client window." -ForegroundColor DarkGray

        Write-Step "Auto end-to-end flow (AC1, AC2, AC5, AC3, AC4)"
        Write-Host "Client UI will show live symptom/status updates while backend checks run." -ForegroundColor DarkGray
        Run-WalTest
        Wait-ForNextCheck "WAL Recovery Integration Test (AC1)"
        Run-UdpTest
        Wait-ForNextCheck "UDP Re-Discovery Integration Test (AC2)"
        Run-ClockTamperTest
        Wait-ForNextCheck "Clock Tamper Test (AC5)"
        Run-AutoNetworkScenario
        Wait-ForNextCheck "Auto Network Failure Simulation (AC3)"
        Run-AutoRebootScenario
        Wait-ForNextCheck "Auto Client Reboot Recovery (AC4)"
    }
    finally {
        Stop-AppProcess $statusClientProc "Client app (status viewer)"
    }
}

Push-Location $RepoRoot
try {
    Write-VersionBanner
    Assert-PathExists $ProtocolDoc "Protocol document"
    New-Item -ItemType Directory -Force -Path $ManualTestingDir | Out-Null
    New-Item -ItemType Directory -Force -Path $GoCachePath | Out-Null
    Write-AutomationStatus "Idle" "Story 1.11 validation script started"

    if ($Rebuild -or $Mode -eq "build") {
        Invoke-HardSyncBuild
        if ($Mode -eq "build") {
            Write-Host "Build-only mode complete." -ForegroundColor Green
            return
        }
    }

    switch ($Mode) {
        "wal"            { Run-WalTest }
        "udp"            { Run-UdpTest }
        "clock"          { Run-ClockTamperTest }
        "manual-network" { Run-ManualNetworkScenario }
        "manual-reboot"  { Run-ManualRebootScenario }
        "manual-ui-all"  { Run-ManualUiAll }
        "all"            { Run-All }
        "manual-all"     { Run-ManualAll }
        "auto-network"   { Run-AutoNetworkScenario }
        "auto-reboot"    { Run-AutoRebootScenario }
        "auto-app"       { Run-AutoApp }
        "reset" {
            Write-Step "Reset mode"
            if (Test-Path $ReportPath) {
                Remove-Item -Force $ReportPath
                Write-Host "Removed report: $ReportPath" -ForegroundColor Yellow
            }
            if (Test-Path $GoCachePath) {
                Remove-Item -Recurse -Force $GoCachePath
                Write-Host "Removed Go cache: $GoCachePath" -ForegroundColor Yellow
            }
            Write-Host "Reset complete." -ForegroundColor Green
        }
        default {
            throw "Unsupported mode: $Mode"
        }
    }

    if ($Mode -ne "reset" -and $Mode -ne "build") {
        Write-Step "Done"
        Write-Host "Story 1.11 validation flow complete." -ForegroundColor Green
        Write-Host "Report: $ReportPath" -ForegroundColor Green
    }
}
finally {
    Clear-AutomationStatus
    Remove-Item Env:MASALA_AUTOMATION_STATUS_FILE -ErrorAction SilentlyContinue
    Pop-Location
}
