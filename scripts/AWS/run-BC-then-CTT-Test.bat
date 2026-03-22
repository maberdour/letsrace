@echo off
rem Sequential test runner: run BC-Test.json first, then CTT-Test.json.

rem Default wait before taskkill. 12s was too short for cold Chrome + UI.Vision (forum: "[UI.Vision RPA] timeout").
if "%LETSRACE_TEST_WAIT_SECS%"=="" set "LETSRACE_TEST_WAIT_SECS=120"

call "%~dp0run-BC-Test-only.bat"
if errorlevel 1 exit /b %ERRORLEVEL%

taskkill /IM chrome.exe /F >nul 2>&1
call "%~dp0run-CTT-Test-only.bat"
exit /b %ERRORLEVEL%

