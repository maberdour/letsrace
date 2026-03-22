@echo off
call "%~dp0run-BC-then-CTT.bat" %*
if errorlevel 1 exit /b %ERRORLEVEL%
shutdown /s /f /t 0
