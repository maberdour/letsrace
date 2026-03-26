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

rem Ampersands must be inside one quoted set — do not use ^& here or UI.Vision sees "CTT-Events^".
rem If the launcher stays on "Waiting for UI.Vision…", chrome://extensions -> UI.Vision -> Allow access to file URLs (this profile).
set "URL=%RUNNER%?direct=1&macro=CTT-Events&closeBrowser=1"

rem WAIT_SECS is a safety cap only; do not sleep the full duration after the macro/browser already finished.
set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
call :log "INFO: Standalone CTT runner launching at %date% %time% with profile ""%PROFILE%"""
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "CTT-Events" %WAIT_SECS% %MACRO_START_EPOCH%
rem taskkill often returns 128 when Chrome already exited (closeBrowser=1); do not propagate that to the caller.
taskkill /IM chrome.exe /F >nul 2>&1
call :log "INFO: Standalone CTT runner finished at %date% %time%"

exit /b 0

:log
setlocal
set "MSG=%~1"
set "LOGFILE=%LOG%"
rem Drive-backed files can intermittently fail to append; retry a few times.
powershell -NoProfile -Command ^
  "$p=$env:LOGFILE; $m=$env:MSG; for($i=0;$i -lt 5;$i++){ try { Add-Content -LiteralPath $p -Value $m -Encoding UTF8; exit 0 } catch { Start-Sleep -Milliseconds 300 } }; exit 1" ^
  >nul 2>&1
endlocal & exit /b 0

