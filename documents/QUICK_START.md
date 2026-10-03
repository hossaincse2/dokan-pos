# 🚀 QUICK START GUIDE - Electron POS

## Installation (5 minutes)

### Step 1: Prerequisites
```bash
# Verify Node.js (18+) and npm are installed
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

### Step 2: Install Dependencies
```bash
cd electron-pos
npm install
```
*This will install all dependencies (~200MB). Takes 2-3 minutes.*

### Step 3: Configure Environment
```bash
cp .env.example .env
# No changes needed for demo - default values work!
```

### Step 4: Start Development Server
```bash
npm run dev
```
*Wait 10-20 seconds for compilation. App window will open automatically.*

## First Login

1. App opens showing login screen
2. Use demo credentials (pre-filled):
   - **Email**: `superadmin@gmail.com`
   - **Password**: `password`
3. Click "Sign In"
4. Wait 5-10 seconds for initial product sync (~13 products)
5. Products appear in POS interface

## Try It Out!

### Create Your First Sale
1. Click on any product to add to cart
2. Adjust quantity using +/- buttons
3. Click "Checkout" button
4. See success message!

### Test Offline Mode
1. Create a sale (it's saved locally)
2. Disable your Wi-Fi/Network
3. Create another sale (still works!)
4. Re-enable network
5. Click "Sync" button in header
6. Watch orders sync to server

### View Order History
1. Click "Orders" in navigation
2. See all your orders
3. Filter by "Synced" or "Unsynced"

### Configure Settings
1. Click "Settings" in navigation
2. Change tax rate (default 15%)
3. Enable/disable auto-sync
4. Set sync interval (2, 5, 15, 30, 60 minutes)
5. Click "Save Settings"

## Building for Production

### Windows
```bash
npm run package:win
```
Output: `release/Electron POS Setup-1.0.0.exe`

### macOS
```bash
npm run package:mac
```
Output: `release/Electron POS-1.0.0.dmg`

### Linux
```bash
npm run package:linux
```
Output: `release/electron-pos-1.0.0.AppImage`

*Build takes 2-3 minutes. Installer will be in `release/` folder.*

## Testing

### Run Unit Tests
```bash
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Type Check
```bash
npm run typecheck
```

## Common Commands

```bash
npm run dev              # Development mode
npm run build            # Production build
npm run package          # Create installer
npm test                 # Run tests
npm run lint             # Check code quality
npm run format           # Format code
npm run db:reset         # Reset database
```

## Troubleshooting

### App won't start
```bash
rm -rf node_modules dist
npm install
npm run dev
```

### Database issues
```bash
npm run db:reset
```

### Build fails
```bash
npm run clean
npm run build
```

### Can't login
1. Check console for errors (View → Toggle Developer Tools)
2. Verify internet connection
3. Confirm API URL in .env is correct

## What's Included?

✅ **44 source files**
✅ **Complete TypeScript codebase**
✅ **SQLite database with migrations**
✅ **Redux state management**
✅ **Full POS functionality**
✅ **Offline-first architecture**
✅ **Sync mechanism**
✅ **Unit & E2E tests**
✅ **Documentation**
✅ **Build configuration**

## Key Files

- `src/main/index.ts` - Electron main process
- `src/renderer/App.tsx` - React app root
- `src/main/database/index.ts` - Database setup
- `src/main/services/sync.service.ts` - Sync logic
- `README.md` - Full documentation
- `ARCHITECTURE.md` - Technical details
- `PROJECT_SUMMARY.md` - Complete overview

## Next Steps

1. ✅ **Test locally** - Run `npm run dev`
2. ✅ **Review code** - Check src/ folder
3. ✅ **Read docs** - README.md and ARCHITECTURE.md
4. ⚙️ **Configure APIs** - Replace stubs in api.service.ts
5. 📦 **Build installers** - Run package commands
6. 🚀 **Deploy** - Distribute to users

## Need Help?

- 📖 **Documentation**: README.md and ARCHITECTURE.md
- 🧪 **Examples**: Check e2e/ and __tests__/ folders
- 💬 **Code Comments**: Throughout the codebase
- 📧 **Support**: Create GitHub issue or email support

---

**Status**: ✅ READY TO USE

Estimated time to get running: **5 minutes**
Estimated time to understand codebase: **30 minutes**
Estimated time to deploy: **1 hour**

**Enjoy building with Electron POS! 🎉**
