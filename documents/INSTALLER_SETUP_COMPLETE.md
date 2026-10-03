# ✅ Windows Installer Setup Complete!

আপনার Electron POS অ্যাপ এখন Windows installer তৈরির জন্য সম্পূর্ণ ready!

## 🎯 তিনটি সহজ উপায়ে Installer তৈরি করুন:

### উপায় ১: Batch File (সবচেয়ে সহজ) ⭐
```bash
build-installer.bat
```
Double-click করুন এবং অপেক্ষা করুন!

### উপায় ২: NPM Command
```bash
npm run package:win
```

### উপায় ৩: Manual Build
```bash
npm run build
npx electron-builder --win
```

---

## 📦 কি কি পাবেন?

Build complete হলে `release/` folder এ পাবেন:

1. **Karbar POS-Setup-1.0.0.exe** (Installer)
   - Desktop shortcut তৈরি করবে
   - Start Menu এ add হবে
   - Uninstaller included
   - Size: ~80-120 MB

2. **Karbar POS-Portable-1.0.0.exe** (Portable)
   - Install ছাড়াই চলবে
   - USB drive এ রাখা যাবে
   - Size: ~80-120 MB

---

## 🎨 Icon Customize করুন (Optional)

### Option 1: Auto-generate
1. Browser এ খুলুন: `assets/create-icon.html`
2. Automatically download হবে `icon.png`
3. এটি `assets/` folder এ রাখুন

### Option 2: নিজের Icon
1. 512x512 বা 256x256 PNG image তৈরি করুন
2. `assets/icon.png` হিসেবে save করুন
3. Rebuild করুন

---

## ⚙️ Configuration (package.json)

```json
{
  "name": "electron-pos",
  "version": "1.0.0",  ← Version change করুন
  "build": {
    "appId": "com.karbar.electronpos",
    "productName": "Karbar POS",
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

---

## 🔧 Production Setup

### 1. API URL Update করুন
`.env` file:
```env
VITE_API_BASE_URL=https://your-production-api.com
```

### 2. Version Update করুন
`package.json`:
```json
"version": "1.0.1"
```

### 3. Build করুন
```bash
npm run package:win
```

---

## 📋 Build Checklist

- [ ] Dependencies installed: `npm install`
- [ ] Icon ready (optional): `assets/icon.png`
- [ ] Production API URL set: `.env`
- [ ] Version updated: `package.json`
- [ ] Test build: `npm run build`
- [ ] Create installer: `npm run package:win`
- [ ] Test installer on clean Windows PC

---

## 🐛 Common Issues

### Issue 1: "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
npm run package:win
```

### Issue 2: Build takes too long
- First build: 5-10 minutes (normal)
- Subsequent builds: 2-3 minutes

### Issue 3: Windows Defender warning
- Normal without code signing certificate
- Users can click "More info" → "Run anyway"
- For production: Get code signing certificate

### Issue 4: Icon not showing
- Ensure `assets/icon.png` exists
- Size must be 256x256 or 512x512
- Format must be PNG

---

## 📚 Documentation Files

- `BUILD_INSTRUCTIONS.md` - Detailed instructions
- `QUICK_BUILD_GUIDE.md` - Quick reference
- `build-installer.bat` - One-click build script

---

## 🚀 Next Steps

1. **Test locally**: Run `build-installer.bat`
2. **Test installer**: Install on a clean Windows PC
3. **Distribute**: Share the Setup.exe file
4. **Update**: Change version and rebuild for updates

---

## 💡 Tips

- **File size**: 80-120 MB is normal (includes Electron runtime)
- **First build**: Takes longer (downloads dependencies)
- **Updates**: Just change version and rebuild
- **Distribution**: Upload to your website or cloud storage
- **Auto-updates**: Consider electron-updater for future

---

## ✨ Features Included

✅ NSIS Installer with custom options
✅ Portable executable
✅ Desktop & Start Menu shortcuts
✅ Uninstaller
✅ 32-bit & 64-bit support
✅ Custom icon support
✅ Production-ready configuration

---

**Ready to build? Run:** `build-installer.bat`

Happy Building! 🎉
