@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
start "Campus Nova Server" cmd /k "node backend\src\server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
