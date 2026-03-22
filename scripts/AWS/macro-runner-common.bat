@echo off
rem Common BAT library for LetsRace macro runners.
rem Usage:
rem   set "DO_SHUTDOWN=0|1"
rem   call "%~dp0macro-runner-common.bat" :Main [ChromeProfileDir]
if /I "%~1"==":Main" (
  shift
  goto :Main
)
goto :EOF

:Main
setlocal EnableExtensions EnableDelayedExpansion

rem === CONFIG ===
rem All content/log files live on the mapped Drive (H:) so the layout is identical on each machine.
set "LOG=H:\My Drive\Clients\LetsRace\NightlyLogs\macro-log.txt"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "CHROME_LOG_DIR=H:\My Drive\Clients\LetsRace\NightlyLogs\chrome"
rem Use a dedicated Chrome profile for automation stability (must have UI.Vision installed/configured).
rem Default: Profile 4 (profile name "Automation"). Override without editing:
rem - BAT arg: (entrypoint).bat "Profile 4"
rem - Env var: LETSRACE_CHROME_PROFILE_DIR=Profile 4
set "CHROME_PROFILE_DIR=Profile 4"
if not "%~1"=="" set "CHROME_PROFILE_DIR=%~1"
if not "%LETSRACE_CHROME_PROFILE_DIR%"=="" set "CHROME_PROFILE_DIR=%LETSRACE_CHROME_PROFILE_DIR%"
>>"%LOG%" echo INFO: Using Chrome profile directory "%CHROME_PROFILE_DIR%"
set "DESKTOP_WAIT=15"  rem seconds; use 60 if script runs at EC2 boot and needs time for desktop
if not "%LETSRACE_DESKTOP_WAIT_SECS%"=="" set "DESKTOP_WAIT=%LETSRACE_DESKTOP_WAIT_SECS%"
set "MACRO_TIMEOUT=2000"  rem max seconds per macro; next macro starts when Chrome exits or this is reached
if not "%LETSRACE_MACRO_TIMEOUT_SECS%"=="" set "MACRO_TIMEOUT=%LETSRACE_MACRO_TIMEOUT_SECS%"
set "CSV_STABLE_SECS=15"  rem minimum age for CSV-based completion (fallback only)
if not "%LETSRACE_CSV_STABLE_SECS%"=="" set "CSV_STABLE_SECS=%LETSRACE_CSV_STABLE_SECS%"
set "MACRO_INITIAL_WAIT_SECS=15"  rem initial delay after launching Chrome
if not "%LETSRACE_MACRO_INITIAL_WAIT_SECS%"=="" set "MACRO_INITIAL_WAIT_SECS=%LETSRACE_MACRO_INITIAL_WAIT_SECS%"
set "MACRO_POLL_WAIT_SECS=10"  rem delay between completion-detection polls
if not "%LETSRACE_MACRO_POLL_WAIT_SECS%"=="" set "MACRO_POLL_WAIT_SECS=%LETSRACE_MACRO_POLL_WAIT_SECS%"
set "UIVISION_LOG_GRACE_SECS=30"  rem tolerate minor clock/filesystem timestamp skew
if not "%LETSRACE_UIVISION_LOG_GRACE_SECS%"=="" set "UIVISION_LOG_GRACE_SECS=%LETSRACE_UIVISION_LOG_GRACE_SECS%"
rem Allow disabling UI.Vision log scanning (useful for local tests where log parsing can hang).
set "SKIP_UIVISION_LOG_CHECK=0"
if not "%LETSRACE_SKIP_UIVISION_LOG_CHECK%"=="" set "SKIP_UIVISION_LOG_CHECK=%LETSRACE_SKIP_UIVISION_LOG_CHECK%"
rem For local debugging: skip PowerShell UI.Vision/CSV completion checks; wait only for Chrome to exit.
set "WAIT_FOR_CHROME_EXIT_ONLY=0"
if not "%LETSRACE_WAIT_FOR_CHROME_EXIT_ONLY%"=="" set "WAIT_FOR_CHROME_EXIT_ONLY=%LETSRACE_WAIT_FOR_CHROME_EXIT_ONLY%"
rem If WAIT_FOR_CHROME_EXIT_ONLY=1, use a fixed delay (not chrome.exe disappearance).
set "CHROME_EXIT_ONLY_FIXED_WAIT_SECS=10"
if not "%LETSRACE_CHROME_EXIT_ONLY_FIXED_WAIT_SECS%"=="" set "CHROME_EXIT_ONLY_FIXED_WAIT_SECS=%LETSRACE_CHROME_EXIT_ONLY_FIXED_WAIT_SECS%"
rem UI.Vision runner HTML lives on the mapped Drive so the same path works on every machine.
rem Expectation: file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html
set "RUNNER=file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html"
rem UI.Vision log directory (used to detect macro completion even if Chrome stays open)
set "UIVISION_LOG_DIR=H:\My Drive\Clients\LetsRace\UIVision\logs"
rem UI.Vision datasources directory (used to detect completion via CSV output when logs are missing)
set "UIVISION_DATASOURCES_DIR=H:\My Drive\Clients\LetsRace\UIVision\datasources"

>>"%LOG%" echo === Script started at %date% %time% ===

rem Ensure chrome log directory exists (best-effort)
if not exist "%CHROME_LOG_DIR%" mkdir "%CHROME_LOG_DIR%" >nul 2>&1

rem Optional: wait for desktop/services to be fully up
timeout /t %DESKTOP_WAIT% >nul

if not exist "%CHROME%" (
  >>"%LOG%" echo Chrome not found at expected paths at %time%.
  echo Chrome not found. Exiting.
  goto :AFTER_MACROS
)

rem Build the query string inline; & inside the quoted argument is safe and does not need ^.
>>"%LOG%" echo INFO: Starting BC + CTT macros at %time%

rem Allow selecting alternative UI.Vision macro JSON via query parameter only.
rem Keep labels as BC-Events/CTT-Events so CSV fallback/canonization stays consistent.
set "BC_MACRO_PARAM=BC-Events"
if not "%LETSRACE_BC_MACRO_PARAM%"=="" set "BC_MACRO_PARAM=%LETSRACE_BC_MACRO_PARAM%"
set "CTT_MACRO_PARAM=CTT-Events"
if not "%LETSRACE_CTT_MACRO_PARAM%"=="" set "CTT_MACRO_PARAM=%LETSRACE_CTT_MACRO_PARAM%"

if /I not "%LETSRACE_SKIP_BC%"=="1" (
  call :RunMacro "BC-Events" "%RUNNER%?direct=1&macro=%BC_MACRO_PARAM%&closeBrowser=1" %MACRO_TIMEOUT%
  >>"%LOG%" echo INFO: Returned from RunMacro BC-Events at %time%
  call :CanonizeCsv "BC-Events"
) else (
  >>"%LOG%" echo INFO: Skipping BC-Events - LETSRACE_SKIP_BC=1 at %time%
)

if /I not "%LETSRACE_SKIP_CTT%"=="1" (
  call :RunMacro "CTT-Events" "%RUNNER%?direct=1&macro=%CTT_MACRO_PARAM%&closeBrowser=1" %MACRO_TIMEOUT%
  >>"%LOG%" echo INFO: Returned from RunMacro CTT-Events at %time%
  call :CanonizeCsv "CTT-Events"
) else (
  >>"%LOG%" echo INFO: Skipping CTT-Events - LETSRACE_SKIP_CTT=1 at %time%
)

:AFTER_MACROS
rem BAT-only runner: Node summarizer/orchestrator is disabled for stability.

if "%DO_SHUTDOWN%"=="1" (
  >>"%LOG%" echo INFO: About to shutdown at %time%
  >>"%LOG%" echo Triggering shutdown at %time%
  shutdown /s /f /t 0
) else (
  >>"%LOG%" echo INFO: Macros finished at %time% - no shutdown testing runner
)

endlocal & exit /b 0


:RunMacro
rem %1 = label, %2 = URL, %3 = timeout seconds
set "LABEL=%~1"
set "URL=%~2"
set "WAITSECS=%~3"
set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"
set "TIMED_OUT=0"
>>"%LOG%" echo DEBUG: %LABEL% start epoch=%MACRO_START_EPOCH% at %time%
>>"%LOG%" echo DEBUG: %LABEL% flags WAIT_FOR_CHROME_EXIT_ONLY=%WAIT_FOR_CHROME_EXIT_ONLY% SKIP_UIVISION_LOG_CHECK=%SKIP_UIVISION_LOG_CHECK% at %time%
set "CHROME_LOG_FILE=%CHROME_LOG_DIR%\chrome-%LABEL%-%MACRO_START_EPOCH%.log"
>>"%LOG%" echo DEBUG: Chrome log file=%CHROME_LOG_FILE% at %time%

rem Clean up any previous Chrome so our launch uses the default profile
taskkill /IM chrome.exe /F >nul 2>&1
set "TASKKILL_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo DEBUG: taskkill chrome exit=%TASKKILL_EXIT% at %time%

>>"%LOG%" echo Launching %LABEL% at %time%

rem Launch Chrome with default profile (must have UI.Vision installed and "Allow access to file URLs" enabled)
rem --hide-crash-restore-bubble suppresses "Chrome didn't shut down correctly" after we taskkill
start "" "%CHROME%" --profile-directory="%CHROME_PROFILE_DIR%" --disable-gpu --no-first-run --hide-crash-restore-bubble --enable-logging --v=1 --log-file="%CHROME_LOG_FILE%" --new-window "%URL%"
>>"%LOG%" echo DEBUG: Chrome start command issued for %LABEL% at %time%

rem Give Chrome time to start, then wait for macro completion or timeout.
rem Do NOT rely on Chrome process exit: other Chrome instances can keep chrome.exe running.
>>"%LOG%" echo DEBUG: Waiting initial %MACRO_INITIAL_WAIT_SECS%s for %LABEL% at %time%
timeout /t %MACRO_INITIAL_WAIT_SECS% >nul
set /a elapsed=%MACRO_INITIAL_WAIT_SECS%
>>"%LOG%" echo DEBUG: Initial wait done for %LABEL% at %time%

rem Deterministic local mode: wait only for chrome to exit.
rem This avoids any UI.Vision/PowerShell log parsing that can stall.
if "%WAIT_FOR_CHROME_EXIT_ONLY%"=="1" (
  >>"%LOG%" echo INFO: WAIT_FOR_CHROME_EXIT_ONLY=1 fixed-wait %CHROME_EXIT_ONLY_FIXED_WAIT_SECS%s for %LABEL% at %time%
  if %CHROME_EXIT_ONLY_FIXED_WAIT_SECS% gtr 0 (
    timeout /t %CHROME_EXIT_ONLY_FIXED_WAIT_SECS% >nul
    set /a elapsed+=%CHROME_EXIT_ONLY_FIXED_WAIT_SECS%
  )
  goto :macrodone
)

rem Expected UI.Vision macro name as it appears in the UI.Vision logs (e.g. "BC-Test.json").
rem Used to avoid matching a previous macro's "Macro completed" line.
set "EXPECTED_PLAYING_MACRO=%LABEL%"
if /I "%LABEL%"=="BC-Events" set "EXPECTED_PLAYING_MACRO=%BC_MACRO_PARAM%"
if /I "%LABEL%"=="CTT-Events" set "EXPECTED_PLAYING_MACRO=%CTT_MACRO_PARAM%"
goto :waitloop

:chrome_exit_only_waitloop
rem Wait until chrome.exe disappears (or until timeout).
>>"%LOG%" echo DEBUG: [chrome_exit_only] checking chrome.exe for %LABEL% at %time%
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
set "CHROME_DETECT_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo DEBUG: [chrome_exit_only] chrome.exe detect exit=%CHROME_DETECT_EXIT% for %LABEL% at %time%

if "%CHROME_DETECT_EXIT%"=="1" goto :chrome_exit_only_done
if %elapsed% geq %WAITSECS% set "TIMED_OUT=1"
if "%TIMED_OUT%"=="1" goto :chrome_exit_only_done

>>"%LOG%" echo DEBUG: [chrome_exit_only] sleeping %MACRO_POLL_WAIT_SECS%s for %LABEL% at %time%
timeout /t %MACRO_POLL_WAIT_SECS% >nul
set /a elapsed+=%MACRO_POLL_WAIT_SECS%
>>"%LOG%" echo DEBUG: [chrome_exit_only] woke up (elapsed=%elapsed%/%WAITSECS%) for %LABEL% at %time%
goto :chrome_exit_only_waitloop

:chrome_exit_only_done
if "%TIMED_OUT%"=="1" (
  >>"%LOG%" echo %LABEL% timed out - waited %elapsed%s at %time%
) else (
  >>"%LOG%" echo %LABEL% finished - waited %elapsed%s at %time%
)
exit /b

:waitloop
>>"%LOG%" echo DEBUG: Checking chrome.exe presence for %LABEL% at %time%
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
set "CHROME_DETECT_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo DEBUG: chrome.exe detect exit=%CHROME_DETECT_EXIT% for %LABEL% at %time%
if "%CHROME_DETECT_EXIT%"=="1" (
  >>"%LOG%" echo WARN: Chrome not detected after initial wait for %LABEL% at %time%
  goto :macrodone
  rem Distinguish clean completion vs crash: if UI.Vision log does not show completion/failure, treat as crash suspected.
  if exist "%UIVISION_LOG_DIR%" (
    >>"%LOG%" echo DEBUG: UI.Vision crash-suspect scan start for %LABEL% at %time%
    powershell -NoProfile -Command ^
      "$d = '%UIVISION_LOG_DIR%'; $label = '%LABEL%'; $minEpoch = [int]'%MACRO_START_EPOCH%'; $minDate = [DateTimeOffset]::FromUnixTimeSeconds($minEpoch).LocalDateTime.AddSeconds(-%UIVISION_LOG_GRACE_SECS%);" ^
      "try {" ^
      "  $f = Get-ChildItem -Path $d -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $minDate } | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
      "  if (-not $f) { exit 2 }" ^
      "  $tail = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -Tail 200;" ^
      "  $text = ($tail -join \"`n\");" ^
      "  $expectedPlaying = 'Playing macro %EXPECTED_PLAYING_MACRO%';" ^
      "  if ($text -match [regex]::Escape($expectedPlaying)) {" ^
      "    if ($text -match 'Macro completed' -or $text -match 'Macro failed' -or $text -match 'Error #\\d+') { exit 0 }" ^
      "  }" ^
      "  exit 3" ^
      "} catch { exit 4 }"
    if errorlevel 1 (
      >>"%LOG%" echo DEBUG: UI.Vision crash-suspect scan exitcode=%ERRORLEVEL% for %LABEL% at %time%
      >>"%LOG%" echo ERROR: Chrome exited before %LABEL% completion - crash suspected at %time%
      >>"%LOG%" echo ERROR: Check UI.Vision log in %UIVISION_LOG_DIR% and Chrome log %CHROME_LOG_FILE%
      if exist "%CHROME_LOG_FILE%" (
        >>"%LOG%" echo ERROR: Chrome log tail - %CHROME_LOG_FILE%
        powershell -NoProfile -Command "Get-Content -Path '%CHROME_LOG_FILE%' -Tail 30 -ErrorAction SilentlyContinue" >>"%LOG%" 2>&1
        >>"%LOG%" echo ERROR: Chrome log Error # lines - %CHROME_LOG_FILE%
        powershell -NoProfile -Command "Select-String -Path '%CHROME_LOG_FILE%' -Pattern 'Error #\\d+' -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -First 5 | ForEach-Object { $_.Line }" >>"%LOG%" 2>&1
      )
    )
  )
  goto :macrodone
)

rem Debug mode: avoid any PowerShell UI.Vision/CSV completion checks; just poll until Chrome exits.
if "%WAIT_FOR_CHROME_EXIT_ONLY%"=="1" (
  >>"%LOG%" echo INFO: WAIT_FOR_CHROME_EXIT_ONLY=1; skipping UI.Vision/CSV checks for %LABEL% at %time%
  goto :poll_and_sleep
)

rem Prefer UI.Vision log completion detection (robust; avoids early exit when CSV exists mid-run).
if /I "%SKIP_UIVISION_LOG_CHECK%"=="1" (
  >>"%LOG%" echo INFO: Skipping UI.Vision log scan - LETSRACE_SKIP_UIVISION_LOG_CHECK=1
  goto :skip_ui_vision_log_completion
)
if exist "%UIVISION_LOG_DIR%" (
  >>"%LOG%" echo DEBUG: UI.Vision completion scan start for %LABEL% at %time%
  powershell -NoProfile -Command ^
    "$d = '%UIVISION_LOG_DIR%'; $grace = %UIVISION_LOG_GRACE_SECS%; $minEpoch = [int]'%MACRO_START_EPOCH%'; $minDate = [DateTimeOffset]::FromUnixTimeSeconds($minEpoch).LocalDateTime.AddSeconds(-$grace);" ^
    "try {" ^
    "  $f = Get-ChildItem -Path $d -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "  if (-not $f) { exit 2 }" ^
    "  if ($f.LastWriteTime -lt $minDate) { exit 2 }" ^
    "  $tail = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue -Tail 200;" ^
    "  $text = ($tail -join \"`n\");" ^
    "  $expectedPlaying = 'Playing macro %EXPECTED_PLAYING_MACRO%';" ^
    "  if ($text -match [regex]::Escape($expectedPlaying)) {" ^
    "    if ($text -match 'Macro completed' -or $text -match 'Macro failed' -or $text -match 'Error #\\d+') { exit 0 }" ^
    "  }" ^
    "  exit 3" ^
    "} catch { exit 4 }"
  >>"%LOG%" echo DEBUG: UI.Vision completion scan exitcode=%ERRORLEVEL% for %LABEL% at %time%
  if not errorlevel 1 goto :macrodone
)

:skip_ui_vision_log_completion
rem Fallback: if the expected output CSV was written during this macro run AND has been stable for a bit, treat it as completed.
rem This covers cases where UI.Vision log files are missing and/or Windows created "(1)" suffixed CSVs.
if exist "%UIVISION_DATASOURCES_DIR%" (
  >>"%LOG%" echo DEBUG: Checking CSV completion for %LABEL% at %time%
  powershell -NoProfile -Command ^
    "$d = '%UIVISION_DATASOURCES_DIR%'; $label = '%LABEL%'; $min = [int]'%MACRO_START_EPOCH%'; $stable = [int]'%CSV_STABLE_SECS%';" ^
    "$pattern = if ($label -eq 'BC-Events') { 'event_data*.csv' } elseif ($label -eq 'CTT-Events') { 'ctt_event_data*.csv' } else { $null };" ^
    "if (-not $pattern) { exit 2 }" ^
    "try {" ^
    "  $f = Get-ChildItem -Path $d -Filter $pattern -File -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "  if (-not $f) { exit 3 }" ^
    "  $mtime = [int][double]::Parse((Get-Date $f.LastWriteTime -UFormat %%s));" ^
    "  if ($mtime -lt $min) { exit 4 }" ^
    "  $age = (New-TimeSpan -Start $f.LastWriteTime -End (Get-Date)).TotalSeconds;" ^
    "  if ($age -lt $stable) { exit 5 }" ^
    "  $sample = Get-Content -Path $f.FullName -ErrorAction Stop -TotalCount 2;" ^
    "  if ($sample.Count -ge 2) { exit 0 }" ^
    "  exit 6" ^
    "} catch { exit 7 }"
  set "CSV_DETECT_EXIT=%ERRORLEVEL%"
  >>"%LOG%" echo DEBUG: CSV completion check exit=%CSV_DETECT_EXIT% for %LABEL% at %time%
  if not errorlevel 1 goto :macrodone
)

:poll_and_sleep
if %elapsed% geq %WAITSECS% goto :macrodone
>>"%LOG%" echo DEBUG: Sleeping %MACRO_POLL_WAIT_SECS%s (elapsed=%elapsed%/%WAITSECS%) for %LABEL% at %time%
timeout /t %MACRO_POLL_WAIT_SECS% >nul
set /a elapsed+=%MACRO_POLL_WAIT_SECS%
>>"%LOG%" echo DEBUG: Woke up (elapsed=%elapsed%/%WAITSECS%) for %LABEL% at %time%
goto :waitloop

:macrodone
if %elapsed% geq %WAITSECS% set "TIMED_OUT=1"
rem Ensure Chrome is closed before next macro
taskkill /IM chrome.exe /F >nul 2>&1

if "%TIMED_OUT%"=="1" (
  >>"%LOG%" echo %LABEL% timed out - waited %elapsed%s at %time%
) else (
  >>"%LOG%" echo %LABEL% finished - waited %elapsed%s at %time%
)
exit /b


:CanonizeCsv
rem Ensure the canonical CSV filename exists for downstream GAS.
rem %1 = label (BC-Events or CTT-Events)
set "LABEL=%~1"
if not exist "%UIVISION_DATASOURCES_DIR%" exit /b

if /I "%LABEL%"=="BC-Events" (
  set "PATTERN=event_data*.csv"
  set "CANON=event_data.csv"
) else if /I "%LABEL%"=="CTT-Events" (
  set "PATTERN=ctt_event_data*.csv"
  set "CANON=ctt_event_data.csv"
) else (
  exit /b
)

>>"%LOG%" echo Canonizing %LABEL% output to %CANON% at %time%
powershell -NoProfile -Command ^
  "$d='%UIVISION_DATASOURCES_DIR%'; $pattern='%PATTERN%'; $canon=Join-Path $d '%CANON%';" ^
  "try {" ^
  "  $f = Get-ChildItem -Path $d -Filter $pattern -File -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
  "  if (-not $f) { exit 2 }" ^
  "  if ($f.FullName -eq $canon) { exit 0 }" ^
  "  Copy-Item -Path $f.FullName -Destination $canon -Force -ErrorAction Stop;" ^
  "  if ($f.FullName -ne $canon) { try { Remove-Item -Path $f.FullName -Force -ErrorAction Stop } catch {} }" ^
  "  exit 0" ^
  "} catch { exit 3 }"
if errorlevel 1 (
  >>"%LOG%" echo WARNING: Failed to canonize %LABEL% CSV at %time%
)
exit /b

