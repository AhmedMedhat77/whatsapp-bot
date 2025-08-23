@echo off
title WhatsApp Bot Server
color 0A

echo ==============================================
echo        Starting WhatsApp Bot Server
echo ==============================================
echo.

echo [*] Checking for Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [*] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [*] Starting WhatsApp Bot server...
echo Press Ctrl+C to stop the server.
echo.

:: Start the development server
call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start the server.
    echo Please check the error messages above.
)

pause