@echo off
setlocal
cd /d %~dp0\..

if not exist .env (
  copy .env.example .env >nul
)

docker --version >nul 2>&1
if %errorlevel%==0 (
  echo Starting Docker deployment...
  docker compose up --build
  goto :eof
)

echo Docker not found. Please use start-windows.ps1 for Node fallback, or install Docker Desktop.
pause
