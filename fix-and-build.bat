@echo off
echo ========================================
echo   Fix Build Error and Rebuild
echo ========================================
echo.

echo [1/5] Stopping all Electron and Node processes...
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo Done!

echo.
echo [2/5] Waiting for file locks to release...
timeout /t 3 /nobreak >nul
echo Done!

echo.
echo [3/5] Cleaning node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo Removed node_modules
) else (
    echo node_modules not found, skipping...
)

if exist package-lock.json (
    del /f package-lock.json
    echo Removed package-lock.json
)

echo.
echo [4/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [5/5] Building installer...
call npm run package:win
if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Installer: release\Karbar POS-Setup-1.0.0.exe
echo Portable: release\Karbar POS-Portable-1.0.0.exe
echo.
pause
