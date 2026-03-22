@echo off
setlocal EnableExtensions

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 3

set "PROFILE=Profile 4"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "PROFILE=%LETSRACE_CHROME_PROFILE_DIR%"
set "WAIT_SECS=2000"
if not "%LETSRACE_MACRO_TIMEOUT_SECS%"=="" set "WAIT_SECS=%LETSRACE_MACRO_TIMEOUT_SECS%"
set "LOG=H:\My Drive\Clients\LetsRace\NightlyLogs\macro-log.txt"

set "RUNNER=file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html"
rem Ampersands must be inside one quoted set — do not use ^& here or UI.Vision sees "CTT-Events^".
set "URL=%RUNNER%?direct=1&macro=CTT-Events&closeBrowser=1"

rem WAIT_SECS is a safety cap only; do not sleep the full duration after the macro/browser already finished.
set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
>>"%LOG%" echo INFO: Standalone CTT runner launching at %date% %time% with profile "%PROFILE%"
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "CTT-Events" %WAIT_SECS% %MACRO_START_EPOCH%
rem taskkill often returns 128 when Chrome already exited (closeBrowser=1); do not propagate that to the caller.
taskkill /IM chrome.exe /F >nul 2>&1
>>"%LOG%" echo INFO: Standalone CTT runner finished at %date% %time%

exit /b 0

