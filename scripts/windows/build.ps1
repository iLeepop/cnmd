#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

Push-Location (Join-Path $Root "vue-md-viewer")
try {
    npm run build:extension
} finally {
    Pop-Location
}

Push-Location $Root
try {
    cargo oxichrome build
    & (Join-Path $ScriptDir "merge-manifest.ps1")
    & (Join-Path $ScriptDir "patch-background-dir-fetch.ps1")
    Write-Host "build: done. Load dist\chromium as unpacked extension."
} finally {
    Pop-Location
}
