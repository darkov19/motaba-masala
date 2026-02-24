param(
    [string]$Mode = "all",
    [ValidateSet("server", "client")]
    [string]$UncheckedKind = "client",
    [switch]$Rebuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$target = Join-Path $PSScriptRoot "story-1-10-windows-installer-hardening-test.ps1"
if (-not (Test-Path $target)) {
    throw "Target script not found: $target"
}

$args = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $target,
    "-Mode", $Mode,
    "-UncheckedKind", $UncheckedKind
)
if ($Rebuild) {
    $args += "-Rebuild"
}

& powershell @args
exit $LASTEXITCODE
