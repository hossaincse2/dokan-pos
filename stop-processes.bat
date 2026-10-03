@echo off
echo Stopping Electron and Node processes...
echo.

taskkill /F /IM electron.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Stopped Electron
) else (
    echo - No Electron process running
)

taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Stopped Node
) else (
    echo - No Node process running
)

echo.
echo Done! You can now run: npm run package:win
echo.
pause
