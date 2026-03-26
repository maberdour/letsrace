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
call :log "INFO: Test CTT runner launching at %date% %time% with profile ""%PROFILE%"""

set "URL=%RUNNER%?direct=1&macro=CTT-Test.json&closeBrowser=1"

set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

rem Number of retries after the first attempt (default: 0 = run once).
rem Run exactly once (no retries).
set "MAX_RETRIES=0"
rem (no retries)

:retry
rem (single attempt)
taskkill /IM chrome.exe /F >nul 2>&1
start "" "%CHROME%" --profile-directory="%PROFILE%" --disable-gpu --no-first-run --hide-crash-restore-bubble --new-window "%URL%"
call "%~dp0test-macro-wait.bat" "CTT-Test.json" %WAIT_SECS% %MACRO_START_EPOCH%
if "%CLOSE_AT_END%"=="1" taskkill /IM chrome.exe /F >nul 2>&1

rem Confirm completion in recent UI.Vision logs (the newest file may belong to BC if timestamps are close).
powershell -NoProfile -Command ^
  "$d = '%LETSRACE_UIVISION_LOG_DIR%'; if (-not $d) { $d = 'H:\My Drive\Clients\LetsRace\UIVision\logs' };" ^
  "$grace=30; $minEpoch=[int]'%MACRO_START_EPOCH%'; $minDate=[DateTimeOffset]::FromUnixTimeSeconds($minEpoch).LocalDateTime.AddSeconds(-$grace);" ^
  "$files = Get-ChildItem -Path $d -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $minDate } | Sort-Object LastWriteTime -Descending | Select-Object -First 8;" ^
  "if (-not $files) { exit 1 };" ^
  "foreach($f in $files) {" ^
  "  $head = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -TotalCount 60;" ^
  "  $tail = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -Tail 500;" ^
  "  $t = (($head + $tail) -join \"`n\");" ^
  "  if ($t -match 'Playing macro CTT-Test(\\.json)?' -and $t -match 'Macro completed') { exit 0 }" ^
  "}" ^
  "exit 1"
if not errorlevel 1 goto :done

call :log "ERROR: CTT-Test.json completion not confirmed (macro may have failed or log write is missing)"
exit /b 7

:done
call :log "INFO: Test CTT runner finished at %date% %time%"
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

