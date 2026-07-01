@echo off
rem Print UTC Unix epoch seconds for macro log time windows.
rem Do NOT use Get-Date -UFormat %%s — on Windows it is ~1h off from true UTC and breaks log matching.
powershell -NoProfile -Command "[int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"
