@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 18 or newer is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm included, then try again.
  pause
  exit /b 1
)

echo Installing project dependencies from package-lock.json...
call npm ci
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  if errorlevel 1 (
    echo Failed to create .env from .env.example.
    pause
    exit /b 1
  )
  echo Created .env. Add your Supabase URL and public anon or publishable key before using the app.
)

echo Starting AuraForm. Press Ctrl+C to stop the server.
call npm run dev
exit /b %errorlevel%
