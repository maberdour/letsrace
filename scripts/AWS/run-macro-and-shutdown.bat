@echo off

:: Create log file entry for startup
echo === Script started at %date% %time% === >> C:\Users\Administrator\macro-log.txt

:: Optional: Wait to ensure desktop has loaded
timeout /t 60 >nul

:: Launch Chrome and run macro 1
echo Launching Chrome at %time% >> C:\Users\Administrator\macro-log.txt
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "file:///C:/Users/Administrator/Desktop/Run-UI.Vision-Macro.html?direct=1&macro=BC-Events&closeBrowser=1"

:: Wait for macro to finish (adjust timing as needed)
timeout /t 900 >nul

:: Launch Chrome and run macro 2
echo Launching Chrome at %time% >> C:\Users\Administrator\macro-log.txt
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "file:///C:/Users/Administrator/Desktop/Run-UI.Vision-Macro.html?direct=1&macro=CTT-Events&closeBrowser=1"

:: Wait for macro to finish (adjust timing as needed)
timeout /t 900 >nul

:: Log shutdown trigger
echo Triggering shutdown at %time% >> C:\Users\Administrator\macro-log.txt

:: Shut down the machine
shutdown /s /f /t 0
