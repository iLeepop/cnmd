@echo off
setlocal
cd /d "%~dp0..\.."
set "ROOT=%CD%"
set "OUT=%ROOT%\dist\chromium\background.js"
set "PRELUDE=%ROOT%\scripts\sw-fetch-prelude.js"

if not exist "%OUT%" (
  echo patch-background-dir-fetch: missing "%OUT%" — run 'cargo oxichrome build' first. >&2
  exit /b 1
)
if not exist "%PRELUDE%" (
  echo patch-background-dir-fetch: missing "%PRELUDE%" >&2
  exit /b 1
)

type "%PRELUDE%" > "%OUT%.cnmd-patch.tmp"
echo. >> "%OUT%.cnmd-patch.tmp"
type "%OUT%" >> "%OUT%.cnmd-patch.tmp"
if errorlevel 1 exit /b 1

move /y "%OUT%.cnmd-patch.tmp" "%OUT%" >nul
echo patch-background-dir-fetch: prepended CNMD_FETCH_FILE listener to "%OUT%"
exit /b 0
