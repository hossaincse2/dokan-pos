# Electron POS - Offline-First Point of Sale System

A production-ready, offline-first Point of Sale (POS) desktop application built with Electron, React, TypeScript, and SQLite. Features complete offline functionality with robust sync capabilities.

## 🏗️ Architecture

### Design Decisions

**Why SQLite?**
- Reliable, ACID-compliant local database
- File-based, no server required
- Small footprint (~500KB)
- Excellent performance for local operations
- Perfect for offline-first architecture

**Why IPC in Main Process for DB?**
- Security: Keeps database access in trusted context
- Prevents SQL injection from renderer
- Centralized data access control
- Better error handling and logging

**Sync Strategy:**
- **Push**: Local changes sent to server in batches
- **Pull**: Server updates merged into local DB
- **Conflict Resolution**: Server authoritative for product data, local authoritative for completed sales
- **Queue System**: Failed syncs queued for retry with exponential backoff

### Technology Stack

- **Electron 28+**: Desktop application framework
- **React 18**: UI library with hooks
- **TypeScript**: Type-safe development
- **Redux Toolkit**: State management
- **SQLite (better-sqlite3)**: Local database
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Jest**: Unit testing
- **Playwright**: E2E testing

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd electron-pos

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Start development server
npm run dev

# This runs both:
# - Vite dev server (React UI) on http://localhost:5173
# - Electron main process with hot reload
```

### Building for Production

```bash
# Build for current platform
npm run package

# Platform-specific builds
npm run package:win     # Windows
npm run package:mac     # macOS
npm run package:linux   # Linux

# Output: release/ directory
```

### Testing

```bash
# Run unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck
```

## 📁 Project Structure

```
electron-pos/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── database/           # SQLite setup & migrations
│   │   ├── services/           # API & sync services
│   │   ├── ipc/                # IPC handlers
│   │   ├── index.ts            # Main entry point
│   │   └── preload.ts          # Preload script
│   ├── renderer/                # React application
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── store/              # Redux store & slices
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Renderer entry point
│   └── shared/                  # Shared types & constants
│       └── types.ts
├── dist/                        # Build output
├── release/                     # Packaged installers
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🔌 API Configuration

### Login Endpoint

```
URL: https://admin.karbar.shop/api/login
Method: POST
Payload: {
  "email_username": "superadmin@gmail.com",
  "password": "password"
}
```

### Products Endpoint

```
URL: https://admin.karbar.shop/api/pos/pos-products
Method: GET
Query Params:
  - search: string
  - category_id: number
  - page: number
  - perPage: number (default: 12)
  - store_id: number (default: 2)
  - available_stock: boolean (default: true)
```

## 🗄️ Database Schema

### Tables

- **products**: Product catalog with variants
- **categories**: Product categories
- **stores**: Store locations
- **customers**: Customer information
- **orders**: Sales transactions
- **order_items**: Line items for orders
- **sync_queue**: Pending sync operations
- **app_settings**: Application configuration
- **sync_history**: Sync operation log
- **meta**: App metadata (last sync, schema version)

### Migrations

Database migrations run automatically on app startup. Schema version tracked in `meta` table.

## 🔄 Sync Mechanism

### Manual Sync

Click "Sync" button in header or use Ctrl/Cmd+S

### Auto-Sync

Configurable in Settings:
- Enable/disable auto-sync
- Interval: 2, 5, 15, 30, or 60 minutes

### Sync Flow

1. **Authenticate**: Verify token validity
2. **Push Local Changes**: 
   - Queue processed in batches (100 items)
   - Orders uploaded to server
   - Stock adjustments synced
   - Failed items marked for retry
3. **Pull Remote Updates**:
   - First sync: Full product catalog
   - Subsequent: Incremental updates
   - Price/stock changes merged
4. **Conflict Resolution**:
   - Server wins for product master data
   - Local wins for completed sales
   - Conflicts logged for admin review

### Dry Run Mode

Preview sync operations without applying:
```javascript
await window.electronAPI.dryRunSync()
```

## ✨ Features

### POS Operations

- **Product Search**: By name or barcode
- **Cart Management**: Add, remove, update quantities
- **Discounts**: Item-level and cart-level
- **Payment Methods**: Cash, card, mobile
- **Receipt Generation**: Print or save as PDF
- **Customer Selection**: Assign to order or guest checkout

### Offline Capability

- ✅ Browse products
- ✅ Search & filter
- ✅ Create sales
- ✅ View order history
- ✅ Stock checks
- ✅ All data queued for sync

### Sync Features

- ✅ Manual and automatic sync
- ✅ Sync status indicator
- ✅ Queue management
- ✅ Sync history log
- ✅ Dry run preview
- ✅ Conflict resolution

### Settings

- Store selection
- Auto-sync configuration
- Tax rate settings
- Receipt customization
- Low stock threshold
- Database backup/restore

## 🧪 Testing

### Unit Tests

Located in `src/**/__tests__/`:
- Redux slice tests
- Service tests
- Utility function tests

Run with: `npm test`

### E2E Tests

Test critical user flows:
- Login
- Initial product seed
- Create order
- Sync operations

Run with: `npm run test:e2e`

### Test Coverage

Aim for 50%+ coverage on critical paths:
```bash
npm test -- --coverage
```

## 🔐 Security

- **Context Isolation**: Enabled (renderer can't access Node.js)
- **Preload Script**: Safely exposes APIs via contextBridge
- **Token Storage**: Uses electron-store with encryption
- **SQL Injection Prevention**: Prepared statements only
- **Input Validation**: All user inputs validated

## 🐛 Troubleshooting

### Database Issues

**Reset database:**
```bash
npm run db:reset
```

Or from app:
Settings → Advanced → Reset Database

**Export/Import:**
```javascript
// Export
await window.electronAPI.exportDb('/path/to/backup.db')

// Import  
await window.electronAPI.importDb('/path/to/backup.db')
```

### Sync Issues

1. Check network connection
2. Verify authentication (re-login)
3. View Sync History for errors
4. Check sync queue count
5. Try manual sync

### Build Issues

```bash
# Clean and rebuild
rm -rf node_modules dist release
npm install
npm run build
npm run package
```

## 📦 Deployment

### Windows

1. Build: `npm run package:win`
2. Output: `release/Electron POS Setup-1.0.0.exe`
3. Distribute NSIS installer

### macOS

1. Build: `npm run package:mac`
2. Output: `release/Electron POS-1.0.0.dmg`
3. Code sign for distribution (requires Apple Developer account)

### Linux

1. Build: `npm run package:linux`
2. Output: 
   - `release/electron-pos-1.0.0.AppImage`
   - `release/electron-pos_1.0.0_amd64.deb`
3. Distribute AppImage or deb package

## 🔧 Configuration

### Environment Variables (.env)

```env
VITE_API_BASE_URL=https://admin.karbar.shop/api
VITE_DEFAULT_STORE_ID=2
VITE_AUTO_SYNC_ENABLED=true
VITE_SYNC_INTERVAL_MINUTES=5
DB_PATH=./data/pos.db
LOG_LEVEL=info
```

### Build Configuration (package.json)

Customize electron-builder settings:
- App ID
- Product name
- Icons
- File associations
- Auto-update URL

## 📊 Performance

- **Cold start**: < 3 seconds
- **Product search**: < 100ms
- **Order creation**: < 500ms
- **Sync (100 orders)**: < 30 seconds
- **Database size**: ~10MB per 10,000 products

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Checklist

- [ ] Initial sync completes successfully
- [ ] Offline operations work without network
- [ ] Orders sync when network restored
- [ ] Search returns relevant results
- [ ] Cart calculations accurate
- [ ] Receipt prints/exports correctly
- [ ] Settings persist across restarts
- [ ] Database migrations run cleanly
- [ ] Tests pass
- [ ] Build succeeds on target platform

## 📝 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Electron team for the framework
- React team for the UI library
- SQLite for the embedded database
- Community contributors

## 📞 Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@yourcompany.com
- Documentation: [docs-url]

---

Built with ❤️ by Your Company
