@echo off
rem Sequential production runner: BC first, then CTT.

call "%~dp0run-BC-only.bat" %*
if errorlevel 1 exit /b %ERRORLEVEL%

rem Ensure previous Chrome instance is fully gone (profile lock / UI.Vision race).
taskkill /IM chrome.exe /F >nul 2>&1

call "%~dp0run-CTT-only.bat" %*
rem Give UI.Vision + Drive-backed logs a moment to flush before returning.
if "%LETSRACE_POSTRUN_GRACE_SECS%"=="" set "LETSRACE_POSTRUN_GRACE_SECS=5"
timeout /t %LETSRACE_POSTRUN_GRACE_SECS% >nul
exit /b %ERRORLEVEL%

