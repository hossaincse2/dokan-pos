@echo off
set ELECTRON_BUILDER_BINARIES_MIRROR=https://mirrors.huaweicloud.com/electron-builder-binaries/
echo ===================================================
echo   KARBAR POS - SUPER DEEP CLEAN ^& REBUILD
echo ===================================================
echo.

echo [1/7] Stopping all related processes...
taskkill /F /IM electron.exe /T >nul 2>&1
taskkill /F /IM "Karbar POS.exe" /T >nul 2>&1
timeout /t 3 /nobreak >nul
echo Done.

echo.
echo [2/7] Cleaning project directories...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
echo Done.

echo.
echo [3/7] Clearing Electron Builder Cache...
set CACHE_DIR=%LOCALAPPDATA%\electron-builder\Cache
if exist "%CACHE_DIR%" (
    echo Removing cache from %CACHE_DIR%...
    rmdir /s /q "%CACHE_DIR%"
)
echo Done.

echo.
echo [4/7] Reinstalling dependencies (this will take a few minutes)...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed! Check your internet.
    pause
    exit /b 1
)

echo.
echo [5/7] Ensuring Electron binary is properly installed...
call node scripts/ensure-electron.js
if errorlevel 1 (
    echo.
    echo WARNING: ensure-electron had issues, continuing anyway...
)
echo Done.

echo.
echo [6/7] Building application...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [7/7] Creating Windows Installer...
echo Running build cache fix to avoid symbolic link errors...
call npm run fix:build
echo Packaging application (x64 only)...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo.
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   SUCCESS! INSTALLER CREATED
echo ===================================================
echo.
echo Installer: release\Karbar POS-Setup-1.0.0.exe
echo.
echo Please send the file to the other PC.
pause
