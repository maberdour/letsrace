@echo off
setlocal EnableExtensions

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 3

set "PROFILE=Profile 1"
if not "%~1"=="" set "PROFILE=%~1"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "PROFILE=%LETSRACE_CHROME_PROFILE_DIR%"
set "WAIT_SECS=2000"
if not "%LETSRACE_MACRO_TIMEOUT_SECS%"=="" set "WAIT_SECS=%LETSRACE_MACRO_TIMEOUT_SECS%"

call "%~dp0macro-runner-paths.bat"
set "_LRPATH_ERR=%ERRORLEVEL%"
if not "%_LRPATH_ERR%"=="0" exit /b %_LRPATH_ERR%

rem Ampersands must be inside one quoted set — do not use ^& here or UI.Vision sees "BC-Events^".
set "URL=%RUNNER%?direct=1&macro=BC-Events&closeBrowser=1"

rem WAIT_SECS is a safety cap only; do not sleep the full duration after the macro/browser already finished.
set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
>>"%LOG%" echo INFO: Standalone BC runner launching at %date% %time% with profile "%PROFILE%"
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "BC-Events" %WAIT_SECS% %MACRO_START_EPOCH%
rem taskkill often returns 128 when Chrome already exited (closeBrowser=1); do not propagate that to the caller.
taskkill /IM chrome.exe /F >nul 2>&1
>>"%LOG%" echo INFO: Standalone BC runner finished at %date% %time%

exit /b 0

