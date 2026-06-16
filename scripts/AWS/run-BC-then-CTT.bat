@echo off
rem Sequential production runner: BC first, then CTT.
rem CTT still runs if BC exhausts retries (independent data sources).

setlocal EnableExtensions

call "%~dp0run-BC-only.bat" %*
set "BC_ERR=%ERRORLEVEL%"

rem Ensure previous Chrome instance is fully gone (profile lock / UI.Vision race).
taskkill /IM chrome.exe /F >nul 2>&1

call "%~dp0run-CTT-only.bat" %*
set "CTT_ERR=%ERRORLEVEL%"

rem Give UI.Vision + Drive-backed logs a moment to flush before returning.
if "%LETSRACE_POSTRUN_GRACE_SECS%"=="" set "LETSRACE_POSTRUN_GRACE_SECS=5"
timeout /t %LETSRACE_POSTRUN_GRACE_SECS% >nul

set "FINAL_ERR=0"
if not "%CTT_ERR%"=="0" set "FINAL_ERR=%CTT_ERR%"
if not "%BC_ERR%"=="0" set "FINAL_ERR=%BC_ERR%"

endlocal & exit /b %FINAL_ERR%
