@echo off
title WhatsApp Bot Launcher
color 0A

echo ==============================================
echo        WhatsApp Bot Docker Launcher
echo ==============================================
echo.

echo [*] Checking if Docker is installed...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo [*] Checking if Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running.
    echo Please start Docker Desktop and wait for it to be ready.
    pause
    exit /b 1
)

echo [*] Building and starting WhatsApp Bot container...
echo This may take a few minutes on first run...
echo.

:: Build and start the container
docker-compose up -d --build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] WhatsApp Bot is now running!
    echo.
    echo To view logs, run: docker logs -f whatsapp-bot
    echo To stop the bot, run: docker-compose down
    echo.
) else (
    echo.
    echo [ERROR] Failed to start WhatsApp Bot.
    echo Please check the error messages above.
    echo.
)

pause
