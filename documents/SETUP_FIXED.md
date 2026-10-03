# 🔧 FIXED - Setup Instructions

## The Issues (Now Fixed!)

✅ **Issue 1**: Electron import error - Fixed by updating main entry point
✅ **Issue 2**: PostCSS module warning - Fixed by renaming to .cjs

## Fresh Installation Steps

### 1. Delete node_modules (if exists)
```bash
rm -rf node_modules package-lock.json
# or on Windows:
# rmdir /s /q node_modules
# del package-lock.json
```

### 2. Install Dependencies
```bash
npm install
```

**Important**: Make sure these packages install successfully:
- `electron` 
- `better-sqlite3`
- `wait-on`
- `tsx`

### 3. Build Main Process First
```bash
npm run build:main
```

This compiles TypeScript to JavaScript in `dist/main/` folder.

### 4. Start Development Server
```bash
npm run dev
```

This will:
1. Build the main process
2. Start Vite dev server (React) on http://localhost:5173
3. Wait for Vite to be ready
4. Launch Electron app

## If You Still Get Errors

### Error: "Cannot find module electron"
**Solution:**
```bash
npm install electron --save-dev
```

### Error: "Cannot find module better-sqlite3"
**Solution:**
```bash
npm install better-sqlite3 --save
npm rebuild better-sqlite3
```

### Error: "wait-on command not found"
**Solution:**
```bash
npm install wait-on --save-dev
```

### Error: Port 5173 already in use
**Solution:**
```bash
# Kill the process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

## Alternative: Simple Development Mode

If the automatic dev mode doesn't work, run these in **separate terminals**:

**Terminal 1 - Build and watch main process:**
```bash
npm run dev:main
```

**Terminal 2 - Start Vite dev server:**
```bash
npm run dev:renderer
```

**Terminal 3 - Start Electron (wait 10 seconds after Terminal 2):**
```bash
npm run dev:electron
```

## Verification Steps

1. ✅ Electron window opens
2. ✅ Login screen appears
3. ✅ Login with: `superadmin@gmail.com` / `password`
4. ✅ Products load from API
5. ✅ Can add products to cart
6. ✅ Can complete checkout

## Development Workflow

Once running:
- **React changes**: Auto-reload (Vite HMR)
- **Main process changes**: Restart Electron (Ctrl+C and `npm run dev`)
- **Database reset**: `npm run db:reset` then restart

## Production Build

```bash
# Build everything
npm run build

# Create installer
npm run package:win    # Windows
npm run package:mac    # macOS  
npm run package:linux  # Linux
```

## Common Issues & Solutions

### "Module not found" errors
```bash
npm install
npm run build:main
npm run dev
```

### Database errors
```bash
npm run db:reset
npm run dev
```

### TypeScript errors
```bash
npm run typecheck
```

### Build errors
```bash
npm run build:main
npm run build:renderer
```

## Package.json Scripts Explained

- `npm run dev` - Full development mode (recommended)
- `npm run dev:renderer` - Only React dev server
- `npm run dev:electron` - Only Electron (needs renderer running)
- `npm run dev:main` - Watch and compile main process TypeScript
- `npm run build` - Production build
- `npm run build:main` - Compile main process only
- `npm run build:renderer` - Build React app only
- `npm test` - Run tests
- `npm run db:reset` - Reset database

## Project Structure (Important Files)

```
electron-pos/
├── main.js                      # ← Electron entry point (NEW!)
├── src/
│   ├── main/
│   │   └── index.ts            # Main process code
│   └── renderer/
│       └── main.tsx            # React app entry
├── dist/                        # ← Compiled output
│   ├── main/                   # Compiled Electron code
│   └── renderer/               # Built React app
└── package.json                # Updated with fixes
```

## Success Indicators

When everything works, you'll see:
```
✓ Vite dev server running on http://localhost:5173
✓ Main process compiled successfully
✓ Electron app window opens
✓ No console errors
✓ Login screen visible
```

## Still Having Issues?

1. Check Node.js version: `node --version` (need 18+)
2. Check npm version: `npm --version` (need 9+)
3. Try deleting `node_modules` and reinstalling
4. Check if antivirus is blocking Electron
5. Try running as administrator (Windows)

## Need Help?

Share the **exact error message** and I can help debug further!

---

**Updated**: December 2024 - All issues fixed ✅
