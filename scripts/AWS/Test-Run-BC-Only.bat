@echo off
setlocal EnableExtensions

if "%LETSRACE_TEST_WAIT_SECS%"=="" set "LETSRACE_TEST_WAIT_SECS=90"

call "%~dp0macro-runner-paths.bat"
if not "%ERRORLEVEL%"=="0" exit /b %ERRORLEVEL%

rem Best-effort: cancel any pending Windows shutdown timer set by another process.
shutdown /a >nul 2>&1

call "%~dp0run-macro-with-retry.bat" "BC-Test.json" %*
exit /b %ERRORLEVEL%
