@echo off
rem Launch a UI.Vision macro via Chrome, retrying on failure (default: up to 3 attempts).
rem Usage: call "%~dp0run-macro-with-retry.bat" <macroName> [chromeProfile]
rem Override attempts: set LETSRACE_MACRO_MAX_ATTEMPTS=3
rem Override retry delay: set LETSRACE_MACRO_RETRY_DELAY_SECS=30

setlocal EnableExtensions EnableDelayedExpansion

set "MACRO_NAME=%~1"
set "PROFILE=Profile 1"
if not "%~2"=="" set "PROFILE=%~2"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "PROFILE=%LETSRACE_CHROME_PROFILE_DIR%"

if "%MACRO_NAME%"=="" (
  echo ERROR: run-macro-with-retry.bat requires a macro name.
  exit /b 2
)

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" exit /b 3

set "WAIT_SECS=2000"
if not "%LETSRACE_MACRO_TIMEOUT_SECS%"=="" set "WAIT_SECS=%LETSRACE_MACRO_TIMEOUT_SECS%"
if not "%LETSRACE_TEST_WAIT_SECS%"=="" set "WAIT_SECS=%LETSRACE_TEST_WAIT_SECS%"

set "MAX_ATTEMPTS=3"
if not "%LETSRACE_MACRO_MAX_ATTEMPTS%"=="" set "MAX_ATTEMPTS=%LETSRACE_MACRO_MAX_ATTEMPTS%"
set "RETRY_DELAY=30"
if not "%LETSRACE_MACRO_RETRY_DELAY_SECS%"=="" set "RETRY_DELAY=%LETSRACE_MACRO_RETRY_DELAY_SECS%"

call "%~dp0macro-runner-paths.bat"
set "_LRPATH_ERR=%ERRORLEVEL%"
if not "%_LRPATH_ERR%"=="0" exit /b %_LRPATH_ERR%

rem Ampersands must be inside one quoted set — do not use ^& here or UI.Vision sees a truncated macro name.
set "URL=%RUNNER%?direct=1&macro=%MACRO_NAME%&closeBrowser=1"

set "ATTEMPT=0"
:attempt_loop
set /a ATTEMPT+=1

for /f %%a in ('"%~dp0get-unix-epoch.bat"') do set "MACRO_START_EPOCH=%%a"

taskkill /IM chrome.exe /F >nul 2>&1
call :log "INFO: %MACRO_NAME% attempt !ATTEMPT! of %MAX_ATTEMPTS% launching at %date% %time% (profile ""%PROFILE%"")"
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "%MACRO_NAME%" %WAIT_SECS% !MACRO_START_EPOCH!
rem taskkill often returns 128 when Chrome already exited (closeBrowser=1); do not propagate that to the caller.
taskkill /IM chrome.exe /F >nul 2>&1

if "%LETSRACE_MACRO_POSTWAIT_GRACE_SECS%"=="" set "LETSRACE_MACRO_POSTWAIT_GRACE_SECS=5"
timeout /t %LETSRACE_MACRO_POSTWAIT_GRACE_SECS% >nul

call "%~dp0check-macro-result.bat" "%MACRO_NAME%" !MACRO_START_EPOCH! %WAIT_SECS%
set "CHECK_RC=!ERRORLEVEL!"
if "!CHECK_RC!"=="0" (
  call :log "INFO: %MACRO_NAME% succeeded on attempt !ATTEMPT! at %date% %time%"
  endlocal & exit /b 0
)

if !ATTEMPT! geq %MAX_ATTEMPTS% (
  call :log "ERROR: %MACRO_NAME% failed after %MAX_ATTEMPTS% attempt(s) at %date% %time%"
  endlocal & exit /b 1
)

call :log "WARN: %MACRO_NAME% attempt !ATTEMPT! did not succeed (check=!CHECK_RC!); retrying in %RETRY_DELAY%s"
timeout /t %RETRY_DELAY% >nul
goto attempt_loop

:log
setlocal
set "MSG=%~1"
set "LOGFILE=%LOG%"
powershell -NoProfile -Command ^
  "$p=$env:LOGFILE; $m=$env:MSG; for($i=0;$i -lt 5;$i++){ try { Add-Content -LiteralPath $p -Value $m -Encoding UTF8; exit 0 } catch { Start-Sleep -Milliseconds 300 } }; exit 1" ^
  >nul 2>&1
endlocal & exit /b 0
