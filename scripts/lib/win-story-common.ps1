Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-StoryStep {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-StoryRepoRoot {
    param([string]$ScriptRoot)
    if ([string]::IsNullOrWhiteSpace($ScriptRoot)) {
        throw "ScriptRoot is required."
    }
    return (Resolve-Path (Join-Path $ScriptRoot "..")).Path
}

function Get-StoryBuildPath {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][ValidateSet("server", "client")][string]$Target
    )
    $exeName = if ($Target -eq "server") { "masala_inventory_server.exe" } else { "masala_inventory_client.exe" }
    return Join-Path $RepoRoot "build\bin\$exeName"
}

function Invoke-StoryBuild {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [ValidateSet("server", "client", "both")][string]$Target = "server"
    )

    Push-Location $RepoRoot
    try {
        New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "build\bin") | Out-Null
        $env:CGO_ENABLED = "1"

        if ($Target -eq "server" -or $Target -eq "both") {
            Write-StoryStep "Building server binary"
            & go build -buildmode=exe -tags "desktop,production,native_webview2loader" -ldflags "-H=windowsgui" -o (Get-StoryBuildPath -RepoRoot $RepoRoot -Target "server") .\cmd\server
            if ($LASTEXITCODE -ne 0) { throw "Server build failed with exit code $LASTEXITCODE" }
        }

        if ($Target -eq "client" -or $Target -eq "both") {
            Write-StoryStep "Building client binary"
            & go build -buildmode=exe -tags "desktop,production,native_webview2loader" -ldflags "-H=windowsgui" -o (Get-StoryBuildPath -RepoRoot $RepoRoot -Target "client") .\cmd\client
            if ($LASTEXITCODE -ne 0) { throw "Client build failed with exit code $LASTEXITCODE" }
        }
    }
    finally {
        Pop-Location
    }
}

function Start-StoryApp {
    param(
        [Parameter(Mandatory = $true)][string]$ExecutablePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = ""
    )
    if (-not (Test-Path $ExecutablePath)) {
        throw "Executable not found: $ExecutablePath"
    }

    $resolvedWorkingDirectory = if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        Split-Path -Parent $ExecutablePath
    } else {
        $WorkingDirectory
    }

    Write-StoryStep "Starting app: $ExecutablePath"
    $process = Start-Process -FilePath $ExecutablePath -ArgumentList $Arguments -WorkingDirectory $resolvedWorkingDirectory -PassThru
    Start-Sleep -Seconds 3
    return $process
}

function Stop-StoryApp {
    param(
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 10
    )
    if ($Process.HasExited) { return }

    Write-StoryStep "Stopping process: $($Process.ProcessName) ($($Process.Id))"
    try {
        $null = $Process.CloseMainWindow()
        if (-not $Process.WaitForExit($TimeoutSeconds * 1000)) {
            Stop-Process -Id $Process.Id -Force
        }
    }
    catch {
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force
        }
    }
}

function Assert-StoryCondition {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$FailureMessage
    )
    if (-not $Condition) {
        throw $FailureMessage
    }
}

function Write-StoryReport {
    param(
        [Parameter(Mandatory = $true)][string]$StoryId,
        [Parameter(Mandatory = $true)][string]$Status,
        [string]$ReportPath = "",
        [string[]]$Notes = @()
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $lines = @(
        "Story: $StoryId",
        "Status: $Status",
        "Timestamp: $timestamp"
    )
    if ($Notes.Count -gt 0) {
        $lines += "Notes:"
        foreach ($note in $Notes) {
            $lines += "- $note"
        }
    }

    Write-Host ""
    Write-Host "===== STORY WINDOWS VALIDATION SUMMARY =====" -ForegroundColor Yellow
    $lines | ForEach-Object { Write-Host $_ }

    if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null
        Set-Content -Path $ReportPath -Value ($lines -join [Environment]::NewLine) -Encoding UTF8
    }
}
