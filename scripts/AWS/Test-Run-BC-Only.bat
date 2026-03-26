@echo off
setlocal EnableExtensions

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 3

set "PROFILE=Profile 1"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "PROFILE=%LETSRACE_CHROME_PROFILE_DIR%"
set "WAIT_SECS=90"
if not "%LETSRACE_TEST_WAIT_SECS%"=="" set "WAIT_SECS=%LETSRACE_TEST_WAIT_SECS%"
set "CLOSE_AT_END=1"
if not "%LETSRACE_CLOSE_AT_END%"=="" set "CLOSE_AT_END=%LETSRACE_CLOSE_AT_END%"

call "%~dp0macro-runner-paths.bat"
set "_LRPATH_ERR=%ERRORLEVEL%"
if not "%_LRPATH_ERR%"=="0" exit /b %_LRPATH_ERR%

rem Best-effort: cancel any pending Windows shutdown timer set by another process.
shutdown /a >nul 2>&1
>>"%LOG%" echo INFO: Test BC runner launching at %date% %time% with profile "%PROFILE%"

set "URL=%RUNNER%?direct=1&macro=BC-Test.json&closeBrowser=1"

set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "BC-Test.json" %WAIT_SECS% %MACRO_START_EPOCH%
if "%CLOSE_AT_END%"=="1" taskkill /IM chrome.exe /F >nul 2>&1
>>"%LOG%" echo INFO: Test BC runner finished at %date% %time%
exit /b 0

