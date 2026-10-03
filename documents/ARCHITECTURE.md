# Electron POS - Architecture Documentation

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (React + Tailwind CSS)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   POS    │  │  Orders  │  │ Settings │  │   Sync   │       │
│  │   Page   │  │   Page   │  │   Page   │  │ History  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ React Components
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                            │
│                    (Redux Toolkit)                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │ Products │  │   Cart   │  │   Sync   │       │
│  │  Slice   │  │  Slice   │  │  Slice   │  │  Slice   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ IPC Communication
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRELOAD SCRIPT                               │
│              (contextBridge - Security Layer)                    │
│    Safely exposes APIs: login, getProducts, createOrder, etc.   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ IPC Channels
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  IPC HANDLERS                           │    │
│  │  - Auth handlers    - Order handlers                   │    │
│  │  - Product handlers - Sync handlers                    │    │
│  │  - Settings handlers                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Database   │  │     API     │  │    Sync     │            │
│  │  Service    │  │   Service   │  │   Service   │            │
│  │  (SQLite)   │  │   (Axios)   │  │  (Queue)    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│        │                  │                  │                   │
└────────┼──────────────────┼──────────────────┼───────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────────────────────────────┐
│   LOCAL     │  │         REMOTE SERVER               │
│  DATABASE   │  │  https://admin.karbar.shop/api      │
│  (SQLite)   │  │  - /login                           │
│             │  │  - /pos/pos-products                │
│  Tables:    │  │  - /pos/orders (stub)               │
│  - products │  │                                     │
│  - orders   │  └─────────────────────────────────────┘
│  - sync_queue│
│  - meta     │
└─────────────┘
```

## Data Flow

### 1. Initial Sync (First Launch)

```
User Login
    │
    ▼
[Renderer] login() → [IPC] → [Main] API Service → Remote Server
    │
    ▼
Store access_token (encrypted)
    │
    ▼
[Renderer] Initial Data Request → [IPC] → [Main]
    │
    ▼
[API Service] Fetch all products from remote
    │
    ▼
[Database Service] Insert products into local SQLite
    │
    ▼
[IPC Response] → [Renderer] Display products
```

### 2. Offline Operation (Create Order)

```
User adds items to cart
    │
    ▼
[Redux Cart Slice] Updates cart state
    │
    ▼
User clicks Checkout
    │
    ▼
[Renderer] createOrder() → [IPC] → [Main]
    │
    ▼
[IPC Handler] Creates order transaction
    │
    ├─ Insert order into orders table
    ├─ Insert items into order_items table
    ├─ Update product stock
    └─ Add to sync_queue
    │
    ▼
[IPC Response] → [Renderer] Order created (local only)
```

### 3. Sync Operation

```
User clicks Sync / Auto-sync triggers
    │
    ▼
[Renderer] startSync() → [IPC] → [Main] Sync Service
    │
    ▼
┌─ PUSH Phase ──────────────────────────────┐
│  1. Get unsynced items from sync_queue    │
│  2. For each order:                       │
│     - POST to remote /pos/orders          │
│     - Update order.remote_id              │
│     - Mark sync_queue item as synced      │
│  3. Handle failures (increment attempts)  │
└───────────────────────────────────────────┘
    │
    ▼
┌─ PULL Phase ──────────────────────────────┐
│  1. Get last_sync_at from meta table      │
│  2. Fetch product updates since timestamp │
│  3. Merge updates into products table     │
│  4. Resolve conflicts (server wins)       │
│  5. Update last_sync_at                   │
└───────────────────────────────────────────┘
    │
    ▼
[IPC Response] → [Renderer] Sync complete
```

## Security Model

### Context Isolation

```
┌────────────────────────┐
│  Renderer Process      │
│  (Untrusted Context)   │
│                        │
│  - No Node.js access   │
│  - No fs, path, etc.   │
│  - Only web APIs       │
└────────────────────────┘
            │
            │ window.electronAPI
            │ (whitelisted methods only)
            ▼
┌────────────────────────┐
│  Preload Script        │
│  (Bridge)              │
│                        │
│  contextBridge.expose  │
└────────────────────────┘
            │
            │ IPC
            ▼
┌────────────────────────┐
│  Main Process          │
│  (Trusted Context)     │
│                        │
│  - Full Node.js access │
│  - Database access     │
│  - Network access      │
│  - File system access  │
└────────────────────────┘
```

### Token Storage

- Access tokens stored using `electron-store` with encryption
- Never exposed to renderer process
- Automatically included in API requests via axios interceptor

### SQL Injection Prevention

All database queries use prepared statements:

```typescript
// ✅ Safe
db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

// ❌ Vulnerable (never used)
db.exec(`SELECT * FROM products WHERE id = ${productId}`);
```

## Sync Guarantees & Conflict Resolution

### Guarantees

1. **At-least-once delivery**: Orders will be synced at least once (may retry on failure)
2. **Eventual consistency**: All devices will eventually have same data after sync
3. **Idempotency**: Multiple syncs of same order won't create duplicates (use local_id)
4. **Ordering**: Sync queue processed in FIFO order

### Conflict Resolution Rules

| Scenario | Resolution | Rationale |
|----------|------------|-----------|
| Product price changed remotely | Server wins | Central pricing authority |
| Product stock changed remotely | Server wins | Inventory truth source |
| Order created locally | Local wins | Completed transaction |
| Same order synced twice | First sync wins | Use remote_id to detect |

### Recovery Steps

1. **Network failure during sync**:
   - Increment attempt counter
   - Keep item in sync_queue
   - Retry on next sync

2. **Invalid token**:
   - Clear token
   - Prompt for re-login
   - Queue remains intact

3. **Server error (500)**:
   - Log error message
   - Increment attempts
   - Exponential backoff

4. **Database corruption**:
   - Export current database
   - Reset to clean state
   - Import backup
   - Re-sync from server

## Performance Characteristics

### Database Indexes

```sql
CREATE INDEX idx_products_sku ON products(sku_code);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_orders_local_id ON orders(local_id);
CREATE INDEX idx_sync_queue_synced ON sync_queue(synced_at);
```

### Query Optimization

- Product search: Full-text search on name and SKU (< 100ms)
- Order creation: Single transaction with FK constraints (< 500ms)
- Sync queue: Batched processing (100 items per batch)

### Memory Management

- Product list: Paginated (20 items per page)
- Search results: Limited to 50 items
- Redux state: Normalized data structures
- Images: Lazy loaded, cached by browser

## Error Handling

### Layered Error Handling

```
┌─ UI Layer ────────────────────────┐
│  - User-friendly error messages   │
│  - Retry buttons                  │
│  - Loading states                 │
└───────────────────────────────────┘
            ▼
┌─ Redux Layer ─────────────────────┐
│  - Async thunk error handling     │
│  - Error state in slices          │
│  - Action error payloads          │
└───────────────────────────────────┘
            ▼
┌─ IPC Layer ───────────────────────┐
│  - Try/catch in handlers          │
│  - Structured error responses     │
│  - Error codes                    │
└───────────────────────────────────┘
            ▼
┌─ Service Layer ───────────────────┐
│  - API error transformation       │
│  - Database error handling        │
│  - Logging                        │
└───────────────────────────────────┘
```

### Error Categories

1. **Network Errors**: Retry with backoff
2. **Auth Errors**: Prompt re-login
3. **Validation Errors**: Show to user
4. **Database Errors**: Log and alert admin
5. **Unknown Errors**: Log and show generic message

## Deployment Considerations

### Platform-Specific

**Windows**:
- NSIS installer
- Start menu shortcuts
- Auto-update via Squirrel

**macOS**:
- DMG installer
- Code signing required for Gatekeeper
- Notarization for distribution

**Linux**:
- AppImage (universal)
- DEB package (Debian/Ubuntu)
- RPM package (Fedora/RHEL)

### Auto-Update Strategy

1. Check for updates on app start
2. Download in background
3. Notify user when ready
4. Install on next restart
5. Preserve database and settings

## Monitoring & Logging

### Log Levels

- **ERROR**: Critical failures
- **WARN**: Recoverable issues
- **INFO**: Important events
- **DEBUG**: Detailed diagnostics

### Log Locations

- Windows: `%APPDATA%\electron-pos\logs\`
- macOS: `~/Library/Logs/electron-pos/`
- Linux: `~/.config/electron-pos/logs/`

### Metrics to Track

- Sync success rate
- Order creation rate
- Average sync duration
- Queue size over time
- Database size growth
- Crash reports

## Future Enhancements

1. **Offline receipt printing**: Via ESCPOS
2. **Multi-store support**: Switch stores without re-login
3. **Product images sync**: Download and cache locally
4. **Backup to cloud**: Automatic database backups
5. **Analytics dashboard**: Sales metrics and reports
6. **Barcode scanner support**: USB HID integration
7. **Receipt customization**: Templates and themes
8. **Multi-language support**: i18n with Bengali and English
9. **Role-based access control**: Cashier vs Manager permissions
10. **Inventory management**: Stock adjustments and transfers

---

Last updated: December 2024
