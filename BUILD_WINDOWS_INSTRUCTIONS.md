# Windows Build Instructions

## Issue
The build is failing due to Windows permission issues with symbolic links when electron-builder tries to download code signing tools.

## Solutions

### Option 1: Enable Developer Mode (Recommended)
1. Open Windows Settings
2. Go to "Update & Security" → "For developers"
3. Enable "Developer Mode"
4. Restart your computer
5. Run: `npm run package:win`

### Option 2: Run as Administrator
1. Right-click on PowerShell or Command Prompt
2. Select "Run as Administrator"
3. Navigate to project f


.\super-fix-build.bat