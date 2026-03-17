@echo off
rem === LetsRace nightly run – Startup folder launcher ===
rem Place a shortcut to this file in the Windows Startup folder so it runs at logon
rem in your interactive session (Chrome + UI.Vision will open visibly).
rem
rem Startup folder: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

set "REPO=H:\My Drive\Clients\LetsRace\Repository\letsrace"
set "BAT=%REPO%\scripts\AWS\run-macro-and-shutdown v2.bat"

rem Give Google Drive and desktop time to be ready after logon
timeout /t 90 /nobreak >nul

rem Run the main macro BAT from repo (same as double-clicking it)
cd /d "%REPO%"
call "%BAT%"
