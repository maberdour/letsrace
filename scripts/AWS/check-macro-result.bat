@echo off
rem Inspect UI.Vision logs for a single macro attempt.
rem Usage: call "%~dp0check-macro-result.bat" <macroName> <startEpochUnix> [maxWindowSecs]
rem Exit 0 = Macro completed, 1 = Macro failed / Error, 2 = inconclusive (no matching log).
rem Epoch must be captured immediately before launching Chrome for the attempt.

set "MACRO_FILE=%~1"
set "START_EPOCH=%~2"
set "MAX_WINDOW=%~3"
if "%MACRO_FILE%"=="" exit /b 2
if "%START_EPOCH%"=="" exit /b 2
if "%MAX_WINDOW%"=="" set "MAX_WINDOW=7200"

if /I "%LETSRACE_SKIP_UIVISION_LOG_CHECK%"=="1" exit /b 0

set "UIVISION_LOG_DIR=H:\My Drive\Clients\LetsRace\UIVision\logs"
if not "%LETSRACE_UIVISION_LOG_DIR%"=="" set "UIVISION_LOG_DIR=%LETSRACE_UIVISION_LOG_DIR%"
set "UIVISION_LOG_GRACE_SECS=30"
if not "%LETSRACE_UIVISION_LOG_GRACE_SECS%"=="" set "UIVISION_LOG_GRACE_SECS=%LETSRACE_UIVISION_LOG_GRACE_SECS%"

powershell -NoProfile -File "%~dp0check-macro-result.ps1" -MacroFile "%MACRO_FILE%" -StartEpoch %START_EPOCH% -MaxWindow %MAX_WINDOW% -LogDir "%UIVISION_LOG_DIR%" -GraceSecs %UIVISION_LOG_GRACE_SECS%

if errorlevel 2 exit /b 2
if errorlevel 1 exit /b 1
exit /b 0
