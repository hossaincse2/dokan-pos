@echo off
echo Building and running Karbar POS...
echo.

REM Build the application
echo [1/2] Building application...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting application...
set NODE_ENV=production
electron .
