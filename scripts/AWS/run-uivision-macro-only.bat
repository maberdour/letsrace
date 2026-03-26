@echo off
rem Launch exactly one UI.Vision macro via a dedicated Chrome invocation.
rem Designed for local test stability: fixed wait + hard exit (no log parsing).
rem Usage (preferred):
rem   set "LETSRACE_MACRO_NAME=BC-Test.json"
rem   call run-uivision-macro-only.bat
rem Backward-compatible:
rem   call run-uivision-macro-only.bat "BC-Test.json"

setlocal EnableExtensions EnableDelayedExpansion

set "MACRO_NAME=%LETSRACE_MACRO_NAME%"
if "%MACRO_NAME%"=="" set "MACRO_NAME=%~1"
if "%MACRO_NAME%"=="" (
  echo ERROR: Missing macro name (e.g. "BC-Test.json")
  exit /b 2
)

rem Chrome + profile
set "CHROME_PROFILE_DIR=Profile 1"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "CHROME_PROFILE_DIR=%LETSRACE_CHROME_PROFILE_DIR%"

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo ERROR: Chrome not found.
  exit /b 3
)

rem Paths
call "%~dp0macro-runner-paths.bat"
set "_LRPATH_ERR=%ERRORLEVEL%"
if not "%_LRPATH_ERR%"=="0" exit /b %_LRPATH_ERR%
if not exist "%CHROME_LOG_DIR%" mkdir "%CHROME_LOG_DIR%" >nul 2>&1

rem Wait time after launching macro (override for slower runs).
set "TEST_WAIT_SECS=12"
if not "%LETSRACE_TEST_WAIT_SECS%"=="" set "TEST_WAIT_SECS=%LETSRACE_TEST_WAIT_SECS%"
rem Keep browser open by default for single-macro visibility.
set "CLOSE_BROWSER=0"
if not "%LETSRACE_CLOSE_BROWSER%"=="" set "CLOSE_BROWSER=%LETSRACE_CLOSE_BROWSER%"
set "FORCE_KILL_AT_END=0"
if not "%LETSRACE_FORCE_KILL_AT_END%"=="" set "FORCE_KILL_AT_END=%LETSRACE_FORCE_KILL_AT_END%"
set "LAUNCH_URL=%RUNNER%?direct=1&macro=%MACRO_NAME%"
if /I "%CLOSE_BROWSER%"=="1" set "LAUNCH_URL=%LAUNCH_URL%&closeBrowser=1"

rem Timestamp for unique chrome log file
set "START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "START_EPOCH=%%a"

set "CHROME_LOG_FILE=%CHROME_LOG_DIR%\chrome-uivision-%MACRO_NAME%-%START_EPOCH%.log"
rem Make sure chrome isn't already running (avoids profile conflicts).
taskkill /IM chrome.exe /F >nul 2>&1

echo INFO: Launching UI.Vision macro "%MACRO_NAME%" at %date% %time%
echo INFO: Profile="%CHROME_PROFILE_DIR%" Wait=%TEST_WAIT_SECS%s CloseBrowser=%CLOSE_BROWSER%
echo INFO: URL=%LAUNCH_URL%

start "" "%CHROME%" --profile-directory="%CHROME_PROFILE_DIR%" --disable-gpu --no-first-run --hide-crash-restore-bubble --enable-logging --v=1 --log-file="%CHROME_LOG_FILE%" --new-window "%LAUNCH_URL%"

timeout /t %TEST_WAIT_SECS% >nul

rem Optional: force-close Chrome when chaining scripts.
if "%FORCE_KILL_AT_END%"=="1" taskkill /IM chrome.exe /F >nul 2>&1

endlocal
exit /b 0

