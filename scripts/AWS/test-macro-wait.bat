@echo off
rem Wait until UI.Vision log shows this macro finished, Chrome exited, or max seconds elapse.
rem Call immediately after starting Chrome for the run (same pattern as macro-runner-common).
rem Usage: call "%~dp0test-macro-wait.bat" <macroFile> <maxSeconds> <startEpochUnix>
rem Example: call "%~dp0test-macro-wait.bat" "BC-Test.json" 120 1712345678

setlocal EnableExtensions EnableDelayedExpansion
set "MACRO_FILE=%~1"
set "MAX_WAIT=%~2"
set "START_EPOCH=%~3"
if "%MACRO_FILE%"=="" endlocal & exit /b 2
if "%MAX_WAIT%"=="" set "MAX_WAIT=120"
if "%START_EPOCH%"=="" endlocal & exit /b 2
set "DONE_REASON="

if /I "%LETSRACE_SKIP_UIVISION_LOG_CHECK%"=="1" (
  timeout /t %MAX_WAIT% >nul
  endlocal & exit /b 0
)

set "UIVISION_LOG_DIR=H:\My Drive\Clients\LetsRace\UIVision\logs"
if not "%LETSRACE_UIVISION_LOG_DIR%"=="" set "UIVISION_LOG_DIR=%LETSRACE_UIVISION_LOG_DIR%"
set "UIVISION_LOG_GRACE_SECS=30"
if not "%LETSRACE_UIVISION_LOG_GRACE_SECS%"=="" set "UIVISION_LOG_GRACE_SECS=%LETSRACE_UIVISION_LOG_GRACE_SECS%"
set "POLL=3"
if not "%LETSRACE_MACRO_POLL_WAIT_SECS%"=="" set "POLL=%LETSRACE_MACRO_POLL_WAIT_SECS%"
set "IW=10"
if not "%LETSRACE_MACRO_INITIAL_WAIT_SECS%"=="" set "IW=%LETSRACE_MACRO_INITIAL_WAIT_SECS%"

timeout /t %IW% >nul
set /a elapsed=%IW%

:waitloop
if !elapsed! geq %MAX_WAIT% goto :waitdone

if exist "%UIVISION_LOG_DIR%" (
  powershell -NoProfile -Command ^
    "$d = '%UIVISION_LOG_DIR%'; $grace = %UIVISION_LOG_GRACE_SECS%; $minEpoch = [int]'%START_EPOCH%'; $minDate = [DateTimeOffset]::FromUnixTimeSeconds($minEpoch).LocalDateTime.AddSeconds(-$grace);" ^
    "try {" ^
    "  $f = Get-ChildItem -Path $d -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "  if (-not $f) { exit 2 }" ^
    "  if ($f.LastWriteTime -lt $minDate) { exit 2 }" ^
    "  $head = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -TotalCount 40;" ^
    "  $tail = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -Tail 250;" ^
    "  $text = (($head + $tail) -join \"`n\");" ^
    "  $expectedPlaying = 'Playing macro %MACRO_FILE%';" ^
    "  if ($text -match [regex]::Escape($expectedPlaying)) {" ^
    "    if ($text -match 'Macro completed' -or $text -match 'Macro failed' -or $text -match 'Error #\\d+') { exit 0 }" ^
    "  }" ^
    "  exit 3" ^
    "} catch { exit 4 }"
  if not errorlevel 1 (
    set "DONE_REASON=LOG_DONE"
    goto :waitdone
  )
)

tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
if errorlevel 1 (
  set "DONE_REASON=CHROME_EXIT"
  goto :waitdone
)

timeout /t !POLL! >nul
set /a elapsed+=!POLL!
goto :waitloop

:waitdone
endlocal & exit /b 0
