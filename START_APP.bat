@echo off
title Karbar POS - Starting...
cls

echo ============================================
echo    KARBAR POS - PRODUCTION MODE
echo ============================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: node_modules not found!
    echo Please run: npm install
    pause
    exit /b 1
)

REM Check if dist folder exists
if not exist "dist" (
    echo Building application for the first time...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo Build failed!
        pause
        exit /b 1
    )
)

echo Starting Karbar POS...
echo.
echo If you see a blank screen:
echo 1. Open DevTools (should open automatically)
echo 2. Check the Console tab for errors
echo 3. Look for "electronAPI is available" message
echo.

set NODE_ENV=production
npm run start:prod
