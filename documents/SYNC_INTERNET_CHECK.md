# Sync Internet Connection Check

## Overview
Enhanced sync functionality to check internet connectivity before attempting to sync. Shows clear error messages when internet is not available.

## Changes Made

### 1. **Pre-Sync Internet Check**
- Checks internet connection before starting sync
- Validates API accessibility
- Prevents sync attempts when offline
- Shows clear error message

### 2. **Connection Validation**
```javascript
// Check internet connectivity first
const isOnline = await this.checkInternetConnection();

if (!isOnline) {
  throw new Error('No internet connection. Please check your network and try again.');
}
```

### 3. **Enhanced API Connection Check**
- Tries `/api/health` endpoint first
- Falls back to `/api/login` endpoint
- 3 second timeout for quick response
- Returns boolean (true/false)

### 4. **Network Error Detection**
Detects network errors during sync:
- `ECONNREFUSED` - Connection refused
- `ENOTFOUND` - DNS lookup failed
- `ETIMEDOUT` - Request timeout
- `ENETUNREACH` - Network unreachable
- Any error containing "network", "timeout", or "connection"

### 5. **Per-API Error Handling**
Each API call now has network error detection:
- Stores sync
- Categories sync
- Customers sync
- Employees sync
- Payment methods sync
- Site settings sync
- Products sync

### 6. **User Notifications**

#### Success Notification
```
┌─────────────────────────────┐
│ ✅ Sync Complete!           │
│    Data synced successfully │
└─────────────────────────────┘
```

#### Network Error Notification
```
┌──────────────────────────────────────┐
│ 🔌 No Internet Connection            │
│    No internet connection. Please    │
│    check your network and try again. │
└──────────────────────────────────────┘
```

#### Connection Lost During Sync
```
┌──────────────────────────────────────┐
│ 🔌 No Internet Connection            │
│    Lost internet connection while    │
│    syncing customers                 │
└──────────────────────────────────────┘
```

## Sync Flow

```
User clicks "Sync"
        ↓
Check Internet Connection
        ↓
    ┌───────┴───────┐
    │               │
Connected      Not Connected
    │               │
    ↓               ↓
Check Offline   Show Error
Mode            "No internet"
    │               │
    ↓               └─> Stop
Reconnect if
needed
    │
    ↓
Start Sync
    │
    ↓
Sync Stores ──────> Network Error? ──> Stop & Show Error
    │
    ↓
Sync Categories ──> Network Error? ──> Stop & Show Error
    │
    ↓
Sync Customers ───> Network Error? ──> Stop & Show Error
    │
    ↓
Sync Employees ───> Network Error? ──> Stop & Show Error
    │
    ↓
Sync Payment ─────> Network Error? ──> Stop & Show Error
Methods
    │
    ↓
Sync Settings ────> Network Error? ──> Stop & Show Error
    │
    ↓
Sync Products ────> Network Error? ──> Stop & Show Error
    │
    ↓
Complete
    │
    ↓
Show Success
```

## Error Messages

### Before Sync Starts
- ✅ "No internet connection. Please check your network and try again."
- ✅ "Cannot sync in offline mode. Please login again."

### During Sync
- ✅ "Lost internet connection while syncing stores"
- ✅ "Lost internet connection while syncing categories"
- ✅ "Lost internet connection while syncing customers"
- ✅ "Lost internet connection while syncing employees"
- ✅ "Lost internet connection while syncing payment methods"
- ✅ "Lost internet connection while syncing site settings"
- ✅ "Lost internet connection while syncing products"

### Authentication Errors
- ✅ "Session expired. Please login again."
- ✅ "Authentication required. Please login to sync data from server."

## API Methods

### `checkInternetConnection()`
```typescript
private async checkInternetConnection(): Promise<boolean> {
  try {
    const api = getApiService();
    await api.checkConnection();
    return true;
  } catch (error) {
    return false;
  }
}
```

### `isNetworkError(error)`
```typescript
private isNetworkError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return errorCode === 'econnrefused' ||
         errorCode === 'enotfound' ||
         errorCode === 'etimedout' ||
         errorCode === 'enetunreach' ||
         errorMessage.includes('network') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('connection');
}
```

### `checkConnection()` (API Service)
```typescript
public async checkConnection(): Promise<boolean> {
  try {
    // Try health endpoint
    await this.client.get('/api/health', { timeout: 3000 });
    return true;
  } catch {
    // Try login endpoint as fallback
    try {
      await this.client.get('/api/login', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
```

## UI Behavior

### Sync Button States

**Online Mode:**
```
┌──────────┐
│   Sync   │  ← Enabled, blue background
└──────────┘
```

**Offline Mode:**
```
┌──────────┐
│   Sync   │  ← Disabled, gray background
└──────────┘
```

**Syncing:**
```
┌──────────────┐
│ Syncing...   │  ← Disabled, shows progress
└──────────────┘
```

### Offline Mode Indicator
```
┌─────────────────────┐
│ 🔌 Offline Mode     │
└─────────────────────┘
```

### Reconnecting Indicator
```
┌─────────────────────┐
│ 🔄 Reconnecting...  │
└─────────────────────┘
```

## Benefits

1. **Prevents Failed Sync Attempts**: Checks connection before trying
2. **Clear Error Messages**: Users know exactly what went wrong
3. **Graceful Degradation**: Stops sync if connection lost mid-way
4. **Better UX**: Visual feedback for all connection states
5. **Resource Efficient**: Doesn't waste API calls when offline

## Testing Scenarios

### Test 1: Sync Without Internet
1. Disconnect internet
2. Click "Sync" button
3. Should see: "No internet connection. Please check your network and try again."
4. Sync should not start

### Test 2: Connection Lost During Sync
1. Start sync with internet connected
2. Disconnect internet during sync
3. Should see: "Lost internet connection while syncing [entity]"
4. Sync should stop gracefully

### Test 3: Reconnection
1. Start in offline mode
2. Reconnect internet
3. Wait up to 30 seconds
4. Should see: "Back Online!" notification
5. Should auto-sync

### Test 4: Offline Mode Indicator
1. Login while offline
2. Should see "🔌 Offline Mode" badge
3. Sync button should be disabled
4. Tooltip should say "Sync disabled in offline mode"

## Configuration

### Connection Check Timeout
```javascript
const CONNECTION_TIMEOUT = 3000; // 3 seconds
```

### Reconnection Check Interval
```javascript
const RECONNECT_INTERVAL = 30000; // 30 seconds
```

### Notification Display Duration
```javascript
const SUCCESS_DURATION = 3000;  // 3 seconds
const ERROR_DURATION = 5000;    // 5 seconds
```

## Future Enhancements

1. **Retry Logic**: Automatic retry with exponential backoff
2. **Partial Sync**: Continue from where it failed
3. **Queue Management**: Better handling of pending syncs
4. **Bandwidth Detection**: Adjust sync strategy based on connection speed
5. **Background Sync**: Sync in background without blocking UI
