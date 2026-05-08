@echo off
setlocal
cd /d "%~dp0..\.."
set "ROOT=%CD%"
set "MAN=%ROOT%\dist\chromium\manifest.json"
set "FRAG=%ROOT%\manifest.fragment.json"

if not exist "%MAN%" (
  echo merge-manifest: missing "%MAN%" — run 'cargo oxichrome build' first. >&2
  exit /b 1
)

where jq >nul 2>&1
if errorlevel 1 (
  echo merge-manifest: jq is required. Install: https://github.com/jqlang/jq/releases or `scoop install jq` / `choco install jq` >&2
  exit /b 1
)

jq -s ".[0] * .[1]" "%MAN%" "%FRAG%" > "%MAN%.tmp"
if errorlevel 1 exit /b 1

move /y "%MAN%.tmp" "%MAN%" >nul
echo merge-manifest: merged host_permissions + content_scripts into "%MAN%"
exit /b 0
