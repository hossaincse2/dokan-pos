# Token Expiry & Auto Logout Implementation

## Overview
Implemented automatic token expiry detection and logout functionality. When any API call returns 401 (Unauthorized), the system automatically logs out the user and prompts them to login again.

## Changes Made

### 1. API Service (`src/main/services/api.service.ts`)
- ✅ Added `mainWindow` property to store reference to BrowserWindow
- ✅ Added `setMainWindow()` method to set the window reference
- ✅ Added `handleTokenExpiry()` method that:
  - Clears auth token and user data from electron-store
  - Clears users from local database
  - Sends `auth:token-expired` event to renderer
- ✅ Updated response interceptor to call `handleTokenExpiry()` on 401 errors
- ✅ Enhanced login error handling with specific messages

### 2. Main Process (`src/main/index.ts`)
- ✅ Set API service main window reference in `createWindow()`
- ✅ API service now has access to send events to renderer

### 3. Sync Service (`src/main/services/sync.service.ts`)
- ✅ Added token validation check before sync
- ✅ Enhanced 401 error handling during category sync
- ✅ Better error messages for authentication failures

### 4. Preload Script (`src/main/preload.ts`)
- ✅ Added `onTokenExpired()` event listener
- ✅ Exposed to renderer via `window.electronAPI`
- ✅ Updated TypeScript declarations

### 5. App Component (`src/renderer/App.tsx`)
- ✅ Added token expiry event listener in useEffect
- ✅ Shows elegant notification when token expires
- ✅ Clears localStorage auth data
- ✅ Reloads app after 2 seconds to show login page

### 6. Styles (`src/renderer/App.css`)
- ✅ Added fade-in animation for notifications
- ✅ Smooth notification appearance

### 7. Database Schema (`src/main/database/index.ts`)
- ✅ Added `users` table to store login credentials and tokens
- ✅ Stores: id, name, email, username, role, status, last_login_at, token

## How It Works

### Login Flow
1. User enters credentials
2. API validates against live server
3. On success:
   - Token saved to electron-store (persistent)
   - User data saved to electron-store
   - User data saved to local database
4. On failure:
   - Clear any existing tokens
   - Show specific error message

### Token Expiry Detection
1. Any API call returns 401 Unauthorized
2. Response interceptor catches the error
3. `handleTokenExpiry()` is called:
   - Clears token from electron-store
   - Clears user from electron-store
   - Clears users from database
   - Sends event to renderer
4. Renderer receives event:
   - Shows notification
   - Clears localStorage
   - Reloads app (shows login page)

### Auto Logout Triggers
- ✅ 401 response from any API call
- ✅ Token expired during sync
- ✅ Token expired during product fetch
- ✅ Token expired during order upload
- ✅ Token expired during any authenticated request

## User Experience

### When Token Expires:
1. User sees elegant notification:
   ```
   🔒 Session Expired
   Please login again to continue
   ```
2. Notification appears for 2 seconds
3. App automatically reloads
4. Login page is shown
5. User logs in again
6. New token is saved
7. User continues working

### Error Messages:
- ✅ "Session expired. Please login again."
- ✅ "Authentication required. Please login to sync data from server."
- ✅ "Cannot connect to server. Please check your internet connection and API URL."
- ✅ "Invalid credentials"

## Benefits

1. **Security**: Expired tokens are immediately cleared
2. **User Experience**: Automatic logout with clear notification
3. **Data Integrity**: No stale tokens in storage
4. **Reliability**: Works across all API calls
5. **Transparency**: User knows exactly what happened

## Testing

To test token expiry:
1. Login successfully
2. Wait for token to expire (or manually expire it on server)
3. Try to sync or make any API call
4. Should see notification and auto-logout
5. Login again with valid credentials
6. Continue working normally

## Notes

- Token expiry is detected automatically on ANY 401 response
- No need to manually check token validity
- Works during sync, product fetch, order upload, etc.
- User data is cleared from both electron-store and database
- Notification is non-blocking and auto-dismisses
