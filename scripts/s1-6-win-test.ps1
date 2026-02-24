param(
    [ValidateSet("all", "auto", "reset")]
    [string]$Mode = "all",
    [string]$ServerPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
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

function Stop-AppProcess([System.Diagnostics.Process]$Process, [string]$Label) {
    if ($null -eq $Process) { return }
    if (-not $Process.HasExited) {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction Stop
            try {
                Wait-Process -Id $Process.Id -Timeout 5 -ErrorAction SilentlyContinue
            } catch {
                # best effort; keep cleanup resilient
            }
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

function Start-AppProcessWithLogs([string]$Path, [string]$Label, [string]$StdOutPath, [string]$StdErrPath, [switch]$AllowImmediateExit) {
    Write-Step "Starting $Label"
    $proc = Start-Process -FilePath $Path -WorkingDirectory $RepoRoot -PassThru -RedirectStandardOutput $StdOutPath -RedirectStandardError $StdErrPath
    Start-Sleep -Seconds 4
    if ($proc.HasExited -and -not $AllowImmediateExit) {
        throw "$Label exited immediately. Path: $Path"
    }
    return $proc
}

function Send-CloseToProcessMainWindow([int]$ProcessId) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class Win32Close {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@ -ErrorAction SilentlyContinue

    $targets = New-Object System.Collections.Generic.List[IntPtr]
    $callback = [Win32Close+EnumWindowsProc]{
        param($hWnd, $lParam)
        $windowPid = 0
        [void][Win32Close]::GetWindowThreadProcessId($hWnd, [ref]$windowPid)
        if ($windowPid -eq $ProcessId -and [Win32Close]::IsWindowVisible($hWnd)) {
            [void]$targets.Add($hWnd)
        }
        return $true
    }

    [void][Win32Close]::EnumWindows($callback, [IntPtr]::Zero)
    if ($targets.Count -eq 0) {
        return $false
    }

    # WM_CLOSE = 0x0010
    foreach ($hWnd in $targets) {
        [void][Win32Close]::PostMessage($hWnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    }
    Start-Sleep -Seconds 2
    return $true
}

function Run-Auto {
    Assert-ServerPath

    $primary = $null
    $secondary = $null

    try {
        $primary = Start-AppProcess $ServerPath "Server app (primary)"
        if ($primary.HasExited) {
            throw "Primary server process exited unexpectedly."
        }

        Write-Step "Close-to-tray resilience check"
        $closeTriggered = Send-CloseToProcessMainWindow $primary.Id
        if (-not $closeTriggered) {
            throw "Could not locate a visible server window to send close signal."
        }
        if ($primary.HasExited) {
            throw "Server exited after close action. Expected minimize/hide-to-tray behavior."
        }
        Write-Host "PASS: close action did not terminate server process." -ForegroundColor Green

        Write-Step "Single-instance guard check"
        $secondary = Start-AppProcess $ServerPath "Server app (secondary launch)" -AllowImmediateExit
        Start-Sleep -Seconds 4

        if ($secondary -ne $null -and -not $secondary.HasExited) {
            throw "Secondary instance stayed running. Single-instance enforcement failed."
        }
        Write-Host "PASS: secondary instance did not remain active." -ForegroundColor Green

        if ($primary.HasExited) {
            throw "Primary instance exited after secondary launch."
        }
        Write-Host "PASS: primary server instance remained active." -ForegroundColor Green

        Write-Step "Watchdog timeout/restart check"
        $watchdogProc = $null
        $prevWatchdogInterval = $env:MASALA_WATCHDOG_INTERVAL_SECONDS
        $prevDisablePings = $env:MASALA_TEST_DISABLE_MONITOR_WATCHDOG_PINGS
        $prevDisableRelaunch = $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH
        try {
            # Stop primary instance first to avoid single-instance short-circuit.
            Stop-AppProcess $primary "Server app (primary)"
            if ($null -ne $primary -and -not $primary.HasExited) {
                throw "Primary server process is still running; cannot start isolated watchdog scenario."
            }
            $primary = $null

            $env:MASALA_WATCHDOG_INTERVAL_SECONDS = "2"
            $env:MASALA_TEST_DISABLE_MONITOR_WATCHDOG_PINGS = "1"
            $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH = "1"

            $watchdogProc = Start-AppProcess $ServerPath "Server app (watchdog scenario)" -AllowImmediateExit
            $deadline = (Get-Date).AddSeconds(20)
            $watchdogFired = $false
            while ((Get-Date) -lt $deadline) {
                if ($watchdogProc.HasExited) {
                    $watchdogFired = $true
                    break
                }
                Start-Sleep -Milliseconds 500
            }
            if (-not $watchdogFired) {
                throw "Watchdog timeout was not observed within expected window."
            }
            if ($watchdogProc.ExitCode -ne 90) {
                throw "Watchdog scenario exited with unexpected code: $($watchdogProc.ExitCode)"
            }
            Write-Host "PASS: watchdog timeout path triggered controlled restart exit." -ForegroundColor Green
        }
        finally {
            Stop-AppProcess $watchdogProc "Server app (watchdog scenario)"
            $env:MASALA_WATCHDOG_INTERVAL_SECONDS = $prevWatchdogInterval
            $env:MASALA_TEST_DISABLE_MONITOR_WATCHDOG_PINGS = $prevDisablePings
            $env:MASALA_TEST_DISABLE_WATCHDOG_RELAUNCH = $prevDisableRelaunch
        }

        Write-Step "Low disk monitor alert check"
        $diskProc = $null
        $stdoutLog = Join-Path $env:TEMP ("masala-s1-6-disk-stdout-{0}.log" -f ([guid]::NewGuid().ToString("N")))
        $stderrLog = Join-Path $env:TEMP ("masala-s1-6-disk-stderr-{0}.log" -f ([guid]::NewGuid().ToString("N")))
        $prevForceLowDisk = $env:MASALA_TEST_FORCE_LOW_DISK_BYTES
        try {
            $env:MASALA_TEST_FORCE_LOW_DISK_BYTES = "1048576"
            $diskProc = Start-AppProcessWithLogs $ServerPath "Server app (low disk scenario)" $stdoutLog $stderrLog

            $deadline = (Get-Date).AddSeconds(20)
            $detected = $false
            while ((Get-Date) -lt $deadline) {
                $stderrContent = if (Test-Path $stderrLog) { Get-Content $stderrLog -Raw -ErrorAction SilentlyContinue } else { "" }
                $stdoutContent = if (Test-Path $stdoutLog) { Get-Content $stdoutLog -Raw -ErrorAction SilentlyContinue } else { "" }
                $combined = "$stderrContent`n$stdoutContent"
                if ($combined -match "Low disk space alert") {
                    $detected = $true
                    break
                }
                Start-Sleep -Seconds 1
            }
            if (-not $detected) {
                throw "Low disk alert log not detected."
            }
            Write-Host "PASS: low disk monitor emitted alert signal." -ForegroundColor Green
        }
        finally {
            Stop-AppProcess $diskProc "Server app (low disk scenario)"
            $env:MASALA_TEST_FORCE_LOW_DISK_BYTES = $prevForceLowDisk
            if (Test-Path $stdoutLog) { Remove-Item -Force $stdoutLog -ErrorAction SilentlyContinue }
            if (Test-Path $stderrLog) { Remove-Item -Force $stderrLog -ErrorAction SilentlyContinue }
        }
    }
    finally {
        Stop-AppProcess $secondary "Server app (secondary launch)"
        Stop-AppProcess $primary "Server app (primary)"
    }
}

Push-Location $RepoRoot
try {
    switch ($Mode) {
        "auto" { Run-Auto }
        "all" { Run-Auto }
        "reset" {
            Write-Step "Reset mode"
            Write-Host "No Story 1.6 artifacts to reset." -ForegroundColor DarkGray
        }
        default { throw "Unsupported mode: $Mode" }
    }

    if ($Mode -ne "reset") {
        Write-Step "Done"
        Write-Host "Story 1.6 validation complete." -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
