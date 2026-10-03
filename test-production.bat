@echo off
echo Testing Production Build...
echo.
echo This will:
echo 1. Build the app
echo 2. Start it in production mode
echo 3. DevTools will open automatically to check for errors
echo.
pause

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Starting app... Check DevTools Console tab for any errors
echo Look for red error messages or check if elements are rendering
echo.

set NODE_ENV=production
npm run start:prod
