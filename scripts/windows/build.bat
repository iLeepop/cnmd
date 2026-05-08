@echo off
setlocal
cd /d "%~dp0..\.."
set "ROOT=%CD%"

pushd "%ROOT%\vue-md-viewer"
call npm run build:extension
if errorlevel 1 goto :fail
popd

cargo oxichrome build
if errorlevel 1 goto :fail

call "%~dp0merge-manifest.bat"
if errorlevel 1 goto :fail

call "%~dp0patch-background-dir-fetch.bat"
if errorlevel 1 goto :fail

echo build: done. Load dist\chromium as unpacked extension.
exit /b 0

:fail
echo build: failed >&2
exit /b 1
