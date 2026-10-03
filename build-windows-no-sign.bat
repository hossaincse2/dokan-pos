@echo off
echo ========================================
echo   Building Windows Installer (No Code Signing)
echo ========================================
echo.

echo This will build the Windows installer without code signing.
echo.

echo [1/2] Building application...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Creating Windows installer (skipping code signing)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win --config.win.sign=null
if errorlevel 1 (
    echo Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo Check the 'release' folder for your installer files.
echo.
pause
