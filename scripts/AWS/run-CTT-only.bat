@echo off
rem Cycling Time Trials production macro (CTT-Events), with automatic retry on failure.
call "%~dp0run-macro-with-retry.bat" "CTT-Events" %*
exit /b %ERRORLEVEL%
