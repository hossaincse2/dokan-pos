# Database Schema Fix Instructions

## Problem
The database was created with an old schema that's missing the `store_id` column and other required columns.

## Solution

### Option 1: Delete and Recreate Database (Recommended)

1. **Close the Electron application completely** (make sure it's not running in the background)

2. **Run this PowerShell command:**
   ```powershell
   $dbPath = "$env:APPDATA\electron-pos\data\pos.db"; if (Test-Path $dbPath) { $backupPath = "$env:APPDATA\electron-pos\data\pos_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"; Copy-Item $dbPath $backupPath; Write-Host "Backup created: $backupPath"; Remove-Item $dbPath; Write-Host "Database deleted: $dbPath"; Write-Host "The database will be recreated on next app start."; } else { Write-Host "Database not found" }
   ```

3. **Restart the application**
   - The database will be automatically recreated with the correct schema
   - All tables will have the proper columns

### Option 2: Manual Delete

1. **Close the Electron application**

2. **Navigate to:**
   ```
   C:\Users\DELL-PC\AppData\Roaming\electron-pos\data\
   ```

3. **Backup the database:**
   - Copy `pos.db` to `pos_backup.db`

4. **Delete the database:**
   - Delete `pos.db`

5. **Restart the application**

### Option 3: Reset via App Settings (If Available)

If your app has a "Reset Database" option in settings, use that.

## What Happens After Reset

- ✅ Database recreated with correct schema
- ✅ All required columns present
- ✅ Orders can be created successfully
- ❌ Previous data will be lost (but backed up)

## Verify the Fix

After restarting the app:
1. Try creating a test order
2. If successful, the database schema is correct
3. You can now use all features including invoice printing

## Database Location

Your database is located at:
```
C:\Users\DELL-PC\AppData\Roaming\electron-pos\data\pos.db
```

Backups are saved in the same directory with timestamp.
