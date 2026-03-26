@echo off
rem Shared LetsRace client paths for UI.Vision Chrome launchers.
rem EC2 / other PCs: if Google Drive is not H:, set before calling the runner, e.g.:
rem   set "LETSRACE_CLIENT_DATA_ROOT=G:\My Drive\Clients\LetsRace"

set "LR_ROOT=H:\My Drive\Clients\LetsRace"
if not "%LETSRACE_CLIENT_DATA_ROOT%"=="" set "LR_ROOT=%LETSRACE_CLIENT_DATA_ROOT%"

set "RUNNER_HTML=%LR_ROOT%\UIVision\launcher\Run-UI.Vision-Macro.html"
set "LOG=%LR_ROOT%\NightlyLogs\macro-log.txt"
set "CHROME_LOG_DIR=%LR_ROOT%\NightlyLogs\chrome"

if not exist "%LR_ROOT%\NightlyLogs\" mkdir "%LR_ROOT%\NightlyLogs\" >nul 2>&1

if not exist "%RUNNER_HTML%" (
  >>"%LOG%" echo ERROR: UI.Vision launcher not found "%RUNNER_HTML%". Set LETSRACE_CLIENT_DATA_ROOT if your Drive letter or path differs.
  echo ERROR: UI.Vision launcher not found "%RUNNER_HTML%"
  echo Set LETSRACE_CLIENT_DATA_ROOT to the folder that contains UIVision and NightlyLogs.
  exit /b 4
)

rem Build file:/// URL with correct encoding (spaces in "My Drive", drive letter overrides).
set "RUNNER="
for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "try { (New-Object System.Uri((Resolve-Path -LiteralPath '%RUNNER_HTML%').Path)).AbsoluteUri } catch { exit 5 }"`) do set "RUNNER=%%U"
if "%RUNNER%"=="" (
  >>"%LOG%" echo ERROR: Could not resolve file URL for "%RUNNER_HTML%"
  exit /b 5
)

if "%LETSRACE_UIVISION_LOG_DIR%"=="" set "LETSRACE_UIVISION_LOG_DIR=%LR_ROOT%\UIVision\logs"

exit /b 0
