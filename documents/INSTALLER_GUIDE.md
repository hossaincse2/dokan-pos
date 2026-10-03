# Karbar POS - Installation Guide

## 🚀 Installation Process

### Step 1: Run the Installer
Double-click `Karbar POS-Setup-1.0.0.exe`

### Step 2: API Configuration (NEW!)
During installation, you'll see a page asking for **API Base URL**:

```
┌─────────────────────────────────────────┐
│  API Configuration                      │
├─────────────────────────────────────────┤
│                                         │
│  Enter the API Base URL for your       │
│  Karbar POS backend:                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ https://admin.karbar.shop         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  This is the server URL where your     │
│  POS data will be synced.              │
│                                         │
│  Default: https://admin.karbar.shop    │
│  You can change this later in Settings.│
│                                         │
└─────────────────────────────────────────┘
```

**Options:**
- **Use Default**: Leave as `https://admin.karbar.shop` (recommended)
- **Custom URL**: Enter your own API server URL (e.g., `https://your-server.com`)

### Step 3: Complete Installation
- Choose installation directory
- Create desktop shortcut (optional)
- Click Install

### Step 4: First Launch
After installation completes:
1. ✅ App opens automatically
2. ✅ Shows login page
3. ✅ API URL is already configured
4. ✅ Login with your credentials
5. ✅ Data syncs automatically

## 📝 Configuration Priority

The app uses this priority for API URL:
1. **User Settings** (changed in Settings page)
2. **Installer Config** (set during installation)
3. **Environment Variable** (VITE_API_BASE_URL)
4. **Default** (https://admin.karbar.shop)

## 🔧 Changing API URL After Installation

Go to: **Settings → API Base URL → Save → Restart App**

## 📦 Files Created

- **Installation**: `C:\Program Files\Karbar POS\`
- **Config**: `C:\Program Files\Karbar POS\api-config.json`
- **Database**: `%APPDATA%\electron-pos\data\pos.db`
- **User Settings**: `%APPDATA%\electron-pos\config.json`

## 🎯 Features

✅ Custom API URL during installation
✅ Automatic login page on first run
✅ Auto-sync after login
✅ Offline-first architecture
✅ Configurable settings
✅ Mock data seeding (if no API)

## 🔄 Building the Installer

```bash
npm run package:win
```

Output: `release/Karbar POS-Setup-1.0.0.exe`

## 📞 Support

For issues or questions, contact your system administrator.
