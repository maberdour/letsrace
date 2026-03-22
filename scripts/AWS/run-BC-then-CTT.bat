@echo off
rem Sequential production runner: BC first, then CTT.

call "%~dp0run-BC-only.bat" %*
if errorlevel 1 exit /b %ERRORLEVEL%

call "%~dp0run-CTT-only.bat" %*
exit /b %ERRORLEVEL%

