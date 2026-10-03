# Offline-First Login Implementation

## Overview
Implemented offline-first login system that allows users to work without internet connection. The system automatically syncs when internet becomes available.

## Features

### 1. **Online Login (Primary)**
- Validates credentials against live API
- Receives fresh authentication token
- Saves user data and credentials to local database
- Enables full sync functionality

### 2. **Offline Login (Fallback)**
- Automatically activates when no internet connection
- Validates credentials against local database
- Logs user in as "GUEST" mode
- Disables sync until internet returns
- Shows offline mode indicator

### 3. **Auto-Reconnection**
- Periodically checks for internet connection (every 30 seconds)
- Automatically re-authenticates when internet returns
- Gets fresh token from server
- Enables sync functionality
- Shows success notification

## How It Works

### Login Flow

```
User enters credentials
        ↓
Try Online Login (5 second timeout)
        ↓
    ┌───────┴───────┐
    │               │
 Success         Network Error
    │               │
    ↓               ↓
Save to DB    Try Offline Login
    │               │
    ↓               ↓
Online Mode   Check Local DB
    │               │
    ↓           ┌───┴───┐
Full Access   Found   Not Found
              │       │
              ↓       ↓
         Guest Mode  Error
         (Offline)
```

### Offline Mode Behavior

**When Offline:**
- ✅ Can login with previously saved credentials
- ✅ Can create orders (saved to local queue)
- ✅ Can view products (from local database)
- ✅ Can view customers (from local database)
- ❌ Cannot sync with server
- ❌ Cannot get fresh data from API
- ⚠️ Shows "Offline Mode" indicator in header

**When Reconnected:**
- ✅ Automatically re-authenticates with server
- ✅ Gets fresh authentication token
- ✅ Automatically syncs pending orders
- ✅ Updates products from server
- ✅ Shows "Back Online!" notification
- ✅ Removes offline mode indicator

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  username TEXT,
  password_hash TEXT,        -- Base64 encoded password
  role TEXT,
  status TEXT DEFAULT 'active',
  last_login_at TEXT,
  token TEXT,                -- Last valid token
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Security

### Password Storage
- Passwords are hashed using Base64 encoding
- **Note:** For production, use bcrypt or argon2 for proper password hashing
- Passwords are only stored after successful online login
- Offline login validates against stored hash

### Token Management
- Fresh tokens obtained on online login
- Tokens stored in electron-store (encrypted)
- Tokens cleared on logout
- Expired tokens trigger auto-logout
- Offline mode uses placeholder token

## UI Indicators

### Offline Mode Badge
```
┌─────────────────────────┐
│ 🔌 Offline Mode         │
└─────────────────────────┘
```

### Reconnecting Badge
```
┌─────────────────────────┐
│ 🔄 Reconnecting...      │
└─────────────────────────┘
```

### Back Online Notification
```
┌─────────────────────────────────┐
│ ✅ Back Online!                 │
│    Syncing with server...       │
└─────────────────────────────────┘
```

## API Methods

### `login(credentials)`
- Tries online login first
- Falls back to offline login on network error
- Returns LoginResponse with offline_mode flag

### `offlineLogin(credentials)`
- Validates against local database
- Checks username/email and password hash
- Returns user data without fresh token
- Sets offline_mode flag

### `isOfflineMode()`
- Checks if currently in offline mode
- Returns boolean

### `checkAndReconnect()`
- Pings API to check connection
- Re-authenticates if connection restored
- Returns boolean (true if reconnected)

## Auto-Reconnection Logic

### Periodic Check (Every 30 seconds)
```javascript
if (isOffline) {
  try {
    await startSync();
    // If sync succeeds, we're online
    setIsOffline(false);
  } catch {
    // Still offline
  }
}
```

### On Sync Attempt
```javascript
if (isOfflineMode()) {
  const reconnected = await checkAndReconnect();
  if (!reconnected) {
    throw new Error('Cannot sync in offline mode');
  }
}
```

## User Experience

### First Time Login (Online)
1. User enters credentials
2. System validates with API
3. Credentials saved to local database
4. User can now login offline

### Subsequent Login (Offline)
1. User enters credentials
2. No internet detected
3. System checks local database
4. User logged in as guest
5. Offline mode indicator shown
6. Sync disabled

### Reconnection
1. Internet becomes available
2. System detects connection
3. Auto re-authenticates with server
4. Gets fresh token
5. Starts auto-sync
6. Shows success notification
7. Offline indicator removed

## Error Messages

### Online Login Errors
- "Invalid credentials"
- "Cannot connect to server. Please check your internet connection and API URL."
- "No authentication token received from server"

### Offline Login Errors
- "Invalid credentials. No internet connection - cannot verify with server."
- "Offline login failed. Please connect to internet to login."

### Sync Errors
- "Cannot sync in offline mode. Please check your internet connection."
- "Session expired. Please login again."

## Configuration

### Reconnection Check Interval
```javascript
const CHECK_INTERVAL = 30000; // 30 seconds
```

### Login Timeout
```javascript
const LOGIN_TIMEOUT = 5000; // 5 seconds
```

### Health Check Timeout
```javascript
const HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds
```

## Testing Scenarios

### Test Offline Login
1. Disconnect internet
2. Try to login with saved credentials
3. Should see "Offline Mode" indicator
4. Should be able to create orders
5. Sync button should be disabled

### Test Auto-Reconnection
1. Login while offline
2. Reconnect internet
3. Wait up to 30 seconds
4. Should see "Back Online!" notification
5. Should auto-sync
6. Offline indicator should disappear

### Test Token Expiry
1. Login successfully
2. Wait for token to expire
3. Try to sync
4. Should auto-logout
5. Should show "Session Expired" message

## Benefits

1. **Uninterrupted Work**: Users can work without internet
2. **Automatic Sync**: No manual intervention needed
3. **Data Safety**: Orders saved locally until synced
4. **User Awareness**: Clear indicators of connection status
5. **Seamless Experience**: Automatic reconnection and sync

## Future Enhancements

1. **Better Password Hashing**: Use bcrypt or argon2
2. **Conflict Resolution**: Handle data conflicts during sync
3. **Partial Sync**: Sync only changed data
4. **Background Sync**: Sync in background without blocking UI
5. **Retry Logic**: Exponential backoff for failed syncs
