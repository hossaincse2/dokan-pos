# Offline-First POS Architecture

## 📋 Overview

This architecture implements a **local-first** approach where:
- All operations use local SQLite database
- Server is only contacted during sync operations
- Authentication token is stored locally
- System works completely offline after initial sync

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. App Starts
   ↓
2. Check Local DB for Token
   ↓
   ├─ Token Exists & Valid → Use Local Data (Offline Mode)
   │  ↓
   │  All CRUD operations use SQLite
   │  No server calls except during sync
   │
   └─ Token Missing/Expired → Show Login Screen
      ↓
      User Enters Credentials
      ↓
      Call Laravel Login API
      ↓
      Save Token + User to Local DB
      ↓
      Use Local Data (Offline Mode)
```

---

## 🗄️ Database Schema

### Local SQLite Tables

```sql
-- Auth table
CREATE TABLE auth_tokens (
  id INTEGER PRIMARY KEY,
  token TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  username TEXT NOT NULL,
  retailer_role_yn TEXT,
  expired_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sync metadata
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'products', 'categories', 'customers', etc.
  last_sync_at TEXT,
  total_records INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending' -- 'pending', 'syncing', 'completed', 'failed'
);
```

---

## 🔄 Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SYNC FLOW                               │
└─────────────────────────────────────────────────────────────┘

User Clicks "Sync Now" or Background Sync Triggers
   ↓
1. Check Local Token
   ↓
   ├─ Valid → Proceed
   └─ Invalid → Force Login
   ↓
2. Fetch Data from Server (with token)
   ├─ GET /api/pos/pos-products
   ├─ GET /api/pos/pos-categories
   ├─ GET /api/pos/pos-customers
   └─ GET /api/pos/pos-payment-method
   ↓
3. Save to Local Database
   ├─ INSERT OR REPLACE products
   ├─ INSERT OR REPLACE categories
   ├─ INSERT OR REPLACE customers
   └─ INSERT OR REPLACE payment_methods
   ↓
4. Update sync_metadata
   ↓
5. Push Local Orders (if any)
   └─ POST /api/pos/orders (with token)
```

---

## 📁 Project Structure

```
src/
├── main/
│   ├── database/
│   │   ├── index.ts              # Database service
│   │   └── migrations.ts         # Schema migrations
│   ├── services/
│   │   ├── auth.service.ts       # Authentication logic
│   │   ├── api.service.ts        # API calls (only during sync)
│   │   ├── sync.service.ts       # Sync orchestration
│   │   └── local-data.service.ts # Local CRUD operations
│   └── ipc/
│       └── handlers.ts           # IPC handlers
└── renderer/
    ├── services/
    │   └── data.service.ts       # Frontend data access
    └── pages/
        └── POSPage.tsx           # UI components
```

---

## 🎯 Key Principles

### 1. **Local-First**
- All reads from local database
- All writes to local database first
- Server sync is asynchronous

### 2. **Token Management**
- Token stored in SQLite (encrypted if needed)
- Checked on app start
- Validated before sync operations

### 3. **Sync Strategy**
- Manual sync via button
- Optional background sync (configurable)
- Conflict resolution (server wins)

### 4. **Error Handling**
- Network errors don't break app
- Failed syncs are logged
- Retry mechanism for failed operations

---

## 🔧 Implementation Details

### Authentication Service
- Manages login/logout
- Stores token locally
- Validates token expiry

### Local Data Service
- All CRUD operations
- No network calls
- Fast and reliable

### Sync Service
- Orchestrates data sync
- Uses stored token
- Handles errors gracefully

### API Service
- Only called during sync
- Uses local token
- Handles 401 (re-login)

---

## 🚀 Benefits

✅ **Works Offline** - No internet required after sync
✅ **Fast Performance** - All data from local DB
✅ **Reliable** - No network failures during operations
✅ **Scalable** - Can handle thousands of products
✅ **Secure** - Token stored locally, encrypted
✅ **User-Friendly** - Seamless experience

---

## 📊 Data Flow Diagram

```
┌──────────────┐
│   UI Layer   │
└──────┬───────┘
       │ (IPC)
┌──────▼────────────────────────────────────┐
│         Main Process                      │
│  ┌────────────────────────────────────┐  │
│  │   Local Data Service               │  │
│  │   (All CRUD Operations)            │  │
│  └────────────┬───────────────────────┘  │
│               │                           │
│  ┌────────────▼───────────────────────┐  │
│  │   SQLite Database                  │  │
│  │   - auth_tokens                    │  │
│  │   - products                       │  │
│  │   - categories                     │  │
│  │   - customers                      │  │
│  │   - orders                         │  │
│  └────────────────────────────────────┘  │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │   Sync Service (Background)        │  │
│  │   - Checks token                   │  │
│  │   - Calls API Service              │  │
│  │   - Updates local DB               │  │
│  └────────────┬───────────────────────┘  │
└───────────────┼───────────────────────────┘
                │ (HTTPS)
       ┌────────▼────────┐
       │  Laravel API    │
       │  (Server)       │
       └─────────────────┘
```

---

## 🔒 Security Considerations

1. **Token Storage**: Store in SQLite with encryption
2. **Token Expiry**: Check before sync operations
3. **HTTPS Only**: All API calls over HTTPS
4. **Data Validation**: Validate all data before storing
5. **SQL Injection**: Use parameterized queries

---

## 📝 Best Practices

1. **Always check local token first**
2. **Never block UI for network operations**
3. **Show sync status to user**
4. **Handle token expiry gracefully**
5. **Log all sync operations**
6. **Implement retry logic**
7. **Use transactions for data consistency**

---

## 🎨 User Experience

### Normal Operation (Offline)
- Instant response
- No loading spinners
- All features work

### Sync Operation
- Show progress indicator
- Non-blocking
- Success/error notifications

### Token Expired
- Automatic redirect to login
- Preserve unsaved data
- Resume after login

---

## 📈 Performance Metrics

- **Local DB Query**: < 10ms
- **Product Load**: < 50ms (1000 products)
- **Cart Operations**: < 5ms
- **Sync Operation**: 2-5 seconds (depends on data size)

---

## 🔄 Migration Strategy

### From Server-First to Local-First

1. Add auth_tokens table
2. Implement token storage on login
3. Create local data service
4. Update all CRUD to use local DB
5. Implement sync service
6. Test offline functionality
7. Deploy gradually

---

## 📚 References

- SQLite Best Practices
- Offline-First Architecture Patterns
- Token-Based Authentication
- Data Synchronization Strategies
