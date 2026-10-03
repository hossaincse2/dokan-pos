@echo off
echo ========================================
echo   Karbar POS - Windows Installer Builder
echo ========================================
echo.

echo [1/3] Checking dependencies...
call npm list electron-builder >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    call npm install
)

echo.
echo [2/3] Building application...
call npm run build
if errorlevel 1 (
    echo Build failed! Please check errors above.
    pause
    exit /b 1
)

echo.
echo [3/3] Creating Windows installer...
call npm run package:win
if errorlevel 1 (
    echo Packaging failed! Please check errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Installer location: release\Karbar POS-Setup-1.0.0.exe
echo Portable version: release\Karbar POS-Portable-1.0.0.exe
echo.
echo You can now distribute these files!
echo.
pause
