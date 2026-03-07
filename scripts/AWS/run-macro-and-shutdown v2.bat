@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem === CONFIG ===
set "LOG=C:\Users\Administrator\macro-log.txt"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "DESKTOP_WAIT=15"  rem seconds; use 60 if script runs at EC2 boot and needs time for desktop
set "MACRO_TIMEOUT=2000"  rem max seconds per macro; next macro starts when Chrome exits or this is reached
set "URL1=file:///C:/Users/Administrator/Desktop/Run-UI.Vision-Macro.html?direct=1&macro=BC-Events&closeBrowser=1"
set "URL2=file:///C:/Users/Administrator/Desktop/Run-UI.Vision-Macro.html?direct=1&macro=CTT-Events&closeBrowser=1"

>>"%LOG%" echo === Script started at %date% %time% ===

rem Optional: wait for desktop/services to be fully up
timeout /t %DESKTOP_WAIT% >nul

if not exist "%CHROME%" (
  >>"%LOG%" echo Chrome not found at expected paths at %time%.
  echo Chrome not found. Exiting.
  goto :END
)

call :RunMacro "BC-Events" "%URL1%" %MACRO_TIMEOUT%
call :RunMacro "CTT-Events" "%URL2%" %MACRO_TIMEOUT%

>>"%LOG%" echo Triggering shutdown at %time%
shutdown /s /f /t 0
goto :EOF


:RunMacro
rem %1 = label, %2 = URL, %3 = timeout seconds
set "LABEL=%~1"
set "URL=%~2"
set "WAITSECS=%~3"

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
if %elapsed% geq %WAITSECS% goto :macrodone
timeout /t 10 >nul
set /a elapsed+=10
goto :waitloop

:macrodone
rem Ensure Chrome is closed before next macro
taskkill /IM chrome.exe /F >nul 2>&1

>>"%LOG%" echo %LABEL% finished (waited %elapsed%s) at %time%
exit /b
:END
endlocal
