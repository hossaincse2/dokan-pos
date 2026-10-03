@echo off
echo ========================================
echo Debugging Karbar POS Blank Screen
echo ========================================
echo.

echo Checking if build files exist...
if not exist "dist\renderer\index.html" (
    echo ERROR: dist\renderer\index.html not found!
    echo Running build...
    call npm run build
)

if not exist "dist\main\main\index.js" (
    echo ERROR: dist\main\main\index.js not found!
    echo Running build...
    call npm run build
)

echo.
echo Build files found. Starting app with debug output...
echo.
call npm run start:prod

pause
