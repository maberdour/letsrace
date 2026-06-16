@echo off
rem British Cycling production macro (BC-Events), with automatic retry on failure.
call "%~dp0run-macro-with-retry.bat" "BC-Events" %*
exit /b %ERRORLEVEL%
