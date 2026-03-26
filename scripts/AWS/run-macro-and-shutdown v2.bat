@echo off
call "%~dp0run-BC-then-CTT.bat" %*
if errorlevel 1 exit /b %ERRORLEVEL%
rem Allow Drive/UI.Vision logs time to flush/sync before poweroff.
rem Override by setting LETSRACE_SHUTDOWN_DELAY_SECS before calling this script.
if "%LETSRACE_SHUTDOWN_DELAY_SECS%"=="" set "LETSRACE_SHUTDOWN_DELAY_SECS=180"
shutdown /s /f /t %LETSRACE_SHUTDOWN_DELAY_SECS%
