#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$Man = Join-Path $Root "dist\chromium\manifest.json"
$Frag = Join-Path $Root "manifest.fragment.json"

if (-not (Test-Path -LiteralPath $Man)) {
    Write-Error "merge-manifest: missing $Man — run 'cargo oxichrome build' first."
}

if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
    Write-Error "merge-manifest: jq is required. Install from https://github.com/jqlang/jq/releases or scoop/choco install jq."
}

$Tmp = Join-Path $env:TEMP ("cnmd-manifest-{0}.json" -f [guid]::NewGuid())
try {
    & jq -s ".[0] * .[1]" $Man $Frag | Out-File -FilePath $Tmp -Encoding utf8
    Move-Item -LiteralPath $Tmp -Destination $Man -Force
    Write-Host "merge-manifest: merged host_permissions + content_scripts into $Man"
} finally {
    if (Test-Path -LiteralPath $Tmp) {
        Remove-Item -LiteralPath $Tmp -Force -ErrorAction SilentlyContinue
    }
}
