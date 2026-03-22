@echo off
setlocal EnableExtensions

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 3

set "PROFILE=Profile 4"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "PROFILE=%LETSRACE_CHROME_PROFILE_DIR%"
set "WAIT_SECS=90"
if not "%LETSRACE_TEST_WAIT_SECS%"=="" set "WAIT_SECS=%LETSRACE_TEST_WAIT_SECS%"
set "CLOSE_AT_END=1"
if not "%LETSRACE_CLOSE_AT_END%"=="" set "CLOSE_AT_END=%LETSRACE_CLOSE_AT_END%"

set "RUNNER=file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html"
set "URL=%RUNNER%?direct=1&macro=CTT-Test.json&closeBrowser=1"

set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "CTT-Test.json" %WAIT_SECS% %MACRO_START_EPOCH%
if "%CLOSE_AT_END%"=="1" taskkill /IM chrome.exe /F >nul 2>&1
exit /b 0

