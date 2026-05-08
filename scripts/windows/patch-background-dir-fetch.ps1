#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$Out = Join-Path $Root "dist\chromium\background.js"
$Prelude = Join-Path $Root "scripts\sw-fetch-prelude.js"

if (-not (Test-Path -LiteralPath $Out)) {
    Write-Error "patch-background-dir-fetch: missing $Out — run 'cargo oxichrome build' first."
}
if (-not (Test-Path -LiteralPath $Prelude)) {
    Write-Error "patch-background-dir-fetch: missing $Prelude"
}

$PreludeText = [System.IO.File]::ReadAllText($Prelude)
$OutText = [System.IO.File]::ReadAllText($Out)
$Combined = $PreludeText + "`n" + $OutText
[System.IO.File]::WriteAllText($Out, $Combined, $Utf8NoBom)

Write-Host "patch-background-dir-fetch: prepended CNMD_FETCH_FILE listener to $Out"
