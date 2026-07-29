<#
.SYNOPSIS
  Live log viewer (modern, dark-mode, auto-refresh) for the engine's JSONL log.

.DESCRIPTION
  Wrapper around scripts/render_log.py. Starts the viewer server, opens the browser,
  and cleans up on Ctrl+C.

.EXAMPLE
  .\logs.ps1
  .\logs.ps1 -Port 9000
  .\logs.ps1 -LogFile ..\logs\app.jsonl
  .\logs.ps1 -NoOpen
#>

param(
    [int]$Port = 8765,
    [string]$LogFile = "..\logs\app.jsonl",
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

# Resolve absolute paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LogPath = (Resolve-Path -LiteralPath (Join-Path $ScriptDir $LogFile) -ErrorAction SilentlyContinue)
if (-not $LogPath) {
    $LogPath = Join-Path $ScriptDir $LogFile
}

# Check log file exists
if (-not (Test-Path -LiteralPath $LogPath)) {
    Write-Host "❌ Log file not found: $LogPath" -ForegroundColor Red
    Write-Host "   Tip: jalankan engine dulu (.\start.ps1) atau tunggu beberapa detik untuk record pertama." -ForegroundColor Yellow
    exit 1
}

# Find Python (prefer uv, then .venv, then python)
$Python = $null
if (Get-Command uv -ErrorAction SilentlyContinue) {
    $Python = "uv"
    $PythonArgs = @("run", "python", "scripts/render_log.py", "`"$LogPath`"", "--port", "$Port")
    if ($NoOpen) { $PythonArgs += "--no-open" }
} elseif (Test-Path ".\.venv\Scripts\python.exe") {
    $Python = ".\.venv\Scripts\python.exe"
    $PythonArgs = @("scripts\render_log.py", "`"$LogPath`"", "--port", "$Port")
    if ($NoOpen) { $PythonArgs += "--no-open" }
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $Python = "python"
    $PythonArgs = @("scripts\render_log.py", "`"$LogPath`"", "--port", "$Port")
    if ($NoOpen) { $PythonArgs += "--no-open" }
} else {
    Write-Host "❌ Python not found. Install Python 3.13+ atau uv." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📂  Starting log viewer..." -ForegroundColor Cyan
Write-Host "    File: $LogPath"
Write-Host "    URL:  http://localhost:$Port"
Write-Host ""

# Run Python, capture Ctrl+C
try {
    & $Python @PythonArgs
} catch {
    Write-Host ""
    Write-Host "❌ Viewer exited with error: $_" -ForegroundColor Red
    exit 1
}
