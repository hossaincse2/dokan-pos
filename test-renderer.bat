@echo off
echo Testing Electron Renderer...
set NODE_ENV=production
electron . 2>&1 | findstr /C:"Renderer Console" /C:"ERROR" /C:"Failed"
pause
