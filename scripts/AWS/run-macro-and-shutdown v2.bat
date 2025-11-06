@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem === CONFIG ===
set "LOG=C:\Users\Administrator\macro-log.txt"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "TMPPROFILE=C:\chrome-temp"
set "DESKTOP_WAIT=60"
set "MACRO_TIMEOUT=900"  rem seconds to wait per macro (15 min)
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

rem Clean up any previous Chrome
taskkill /IM chrome.exe /F >nul 2>&1

rem Fresh temp profile for stability
if exist "%TMPPROFILE%" rmdir /s /q "%TMPPROFILE%" >nul 2>&1
mkdir "%TMPPROFILE%" >nul 2>&1

>>"%LOG%" echo Launching %LABEL% at %time%

rem Launch Chrome with stability flags
start "" "%CHROME%" --disable-gpu --no-first-run --new-window --user-data-dir="%TMPPROFILE%" "%URL%"

rem Wait for macro to complete (coarse timer)
timeout /t %WAITSECS% >nul

rem Ensure Chrome is closed before next macro
taskkill /IM chrome.exe /F >nul 2>&1

>>"%LOG%" echo %LABEL% finished (waited %WAITSECS%s) at %time%
exit /b
:END
endlocal
