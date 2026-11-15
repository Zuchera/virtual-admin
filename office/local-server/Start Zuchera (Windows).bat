@echo off
title Zuchera Local Server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this computer. It is free and takes a minute.
  echo Opening the download page. Install the LTS version, then double-click this file again.
  start https://nodejs.org/en/download
  pause
  exit /b
)
node server.js
pause
