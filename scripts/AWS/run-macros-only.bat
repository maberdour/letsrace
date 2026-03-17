@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem === CONFIG (same as run-macro-and-shutdown v2.bat but NO shutdown) ===
rem Used when Node orchestrator (example-nightly-run.js) runs the macros; orchestrator writes summary then calls shutdown.
rem All content/log files live on the mapped Drive (H:) so the layout is identical on each machine.
set "LOG=H:\My Drive\Clients\LetsRace\NightlyLogs\macro-log.txt"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "DESKTOP_WAIT=15"  rem seconds; use 60 if script runs at EC2 boot and needs time for desktop
set "MACRO_TIMEOUT=2000"  rem max seconds per macro; next macro starts when Chrome exits or this is reached
rem UI.Vision runner HTML lives on the mapped Drive so the same path works on every machine.
rem Expectation: file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html
set "RUNNER=file:///H:/My Drive/Clients/LetsRace/UIVision/launcher/Run-UI.Vision-Macro.html"
rem UI.Vision datasources directory (used to detect completion via CSV output when Chrome stays open)
set "UIVISION_DATASOURCES_DIR=H:\My Drive\Clients\LetsRace\UIVision\datasources"

>>"%LOG%" echo === Script started at %date% %time% ===

rem Optional: wait for desktop/services to be fully up
timeout /t %DESKTOP_WAIT% >nul

if not exist "%CHROME%" (
  >>"%LOG%" echo Chrome not found at expected paths at %time%.
  echo Chrome not found. Exiting.
  goto :END
)

rem Build the query string inline; & inside the quoted argument is safe and does not need ^.
call :RunMacro "BC-Events" "%RUNNER%?direct=1&macro=BC-Events&closeBrowser=1" %MACRO_TIMEOUT%
call :CanonizeCsv "BC-Events"
call :RunMacro "CTT-Events" "%RUNNER%?direct=1&macro=CTT-Events&closeBrowser=1" %MACRO_TIMEOUT%
call :CanonizeCsv "CTT-Events"

>>"%LOG%" echo Macros finished at %time% (orchestrator will write summary and shutdown if configured)
goto :EOF


:RunMacro
rem %1 = label, %2 = URL, %3 = timeout seconds
set "LABEL=%~1"
set "URL=%~2"
set "WAITSECS=%~3"
set "MACRO_START_EPOCH="
for /f %%a in ('powershell -NoProfile -Command "[int][double]::Parse((Get-Date -UFormat %%s))"') do set "MACRO_START_EPOCH=%%a"

rem Clean up any previous Chrome so our launch uses the default profile
taskkill /IM chrome.exe /F >nul 2>&1

>>"%LOG%" echo Launching %LABEL% at %time%

rem Launch Chrome with default profile (must have UI.Vision installed and "Allow access to file URLs" enabled)
start "" "%CHROME%" --disable-gpu --no-first-run --new-window "%URL%"

rem Give Chrome time to start, then wait for it to exit (macro done) or timeout
timeout /t 15 >nul
set /a elapsed=15

:waitloop
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I "chrome.exe" >NUL
if errorlevel 1 goto :macrodone

rem If the expected output CSV was written during this macro run, treat it as completed.
rem This covers cases where Windows created "(1)" suffixed CSVs.
if exist "%UIVISION_DATASOURCES_DIR%" (
  powershell -NoProfile -Command ^
    "$d = '%UIVISION_DATASOURCES_DIR%'; $label = '%LABEL%'; $min = [int]'%MACRO_START_EPOCH%';" ^
    "$pattern = if ($label -eq 'BC-Events') { 'event_data*.csv' } elseif ($label -eq 'CTT-Events') { 'ctt_event_data*.csv' } else { $null };" ^
    "if (-not $pattern) { exit 2 }" ^
    "try {" ^
    "  $f = Get-ChildItem -Path $d -Filter $pattern -File -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
    "  if (-not $f) { exit 3 }" ^
    "  $mtime = [int][double]::Parse((Get-Date $f.LastWriteTime -UFormat %%s));" ^
    "  if ($mtime -lt $min) { exit 4 }" ^
    "  $lines = (Get-Content -Path $f.FullName -ErrorAction Stop | Measure-Object -Line).Lines;" ^
    "  if ($lines -ge 2) { exit 0 }" ^
    "  exit 5" ^
    "} catch { exit 6 }"
  if not errorlevel 1 goto :macrodone
)

if %elapsed% geq %WAITSECS% goto :macrodone
timeout /t 10 >nul
set /a elapsed+=10
goto :waitloop

:macrodone
rem Ensure Chrome is closed before next macro
taskkill /IM chrome.exe /F >nul 2>&1

>>"%LOG%" echo %LABEL% finished (waited %elapsed%s) at %time%
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
  "  Copy-Item -Path $f.FullName -Destination $canon -Force -ErrorAction Stop;" ^
  "  if ($f.FullName -ne $canon) { try { Remove-Item -Path $f.FullName -Force -ErrorAction Stop } catch {} }" ^
  "  exit 0" ^
  "} catch { exit 3 }"
if errorlevel 1 (
  >>"%LOG%" echo WARNING: Failed to canonize %LABEL% CSV at %time%
)
exit /b
:END
endlocal
