# 🎯 Windows Installer তৈরি করুন - সহজ গাইড

## এক লাইনে Installer তৈরি করুন:

```bash
npm run package:win
```

অথবা double-click করুন: **`build-installer.bat`**

---

## 📦 কি পাবেন?

`release/` folder এ:
- ✅ **Karbar POS-Setup-1.0.0.exe** - Full installer
- ✅ **Karbar POS-Portable-1.0.0.exe** - Portable version

---

## ⚡ Quick Start

### 1️⃣ Dependencies Install করুন (প্রথমবার)
```bash
npm install
```

### 2️⃣ Installer তৈরি করুন
```bash
npm run package:win
```

### 3️⃣ Done! 🎉
`release/` folder এ installer পাবেন।

---

## 🎨 Icon Change করতে চান?

### সহজ উপায়:
1. Browser এ খুলুন: `assets/create-icon.html`
2. Auto-download হবে
3. File টি `assets/icon.png` হিসেবে save করুন

### নিজের Logo:
- 512x512 PNG image
- Save as: `assets/icon.png`

---

## ⚙️ Production এর জন্য

### API URL Change করুন:
`.env` file:
```
VITE_API_BASE_URL=https://your-api.com
```

### Version Update করুন:
`package.json`:
```json
"version": "1.0.1"
```

---

## 🚀 Build Commands

| Command | কি করবে |
|---------|---------|
| `npm run build` | শুধু build করবে |
| `npm run package:win` | Installer তৈরি করবে |
| `npm run icon:check` | Icon check করবে |
| `build-installer.bat` | সব একসাথে করবে |

---

## 📝 Installer Features

✅ Desktop shortcut  
✅ Start Menu entry  
✅ Custom install location  
✅ Uninstaller included  
✅ Auto-run after install  
✅ 32-bit & 64-bit support  

---

## ⏱️ সময় লাগবে

- **প্রথমবার**: 5-10 মিনিট (dependencies download)
- **পরবর্তীতে**: 2-3 মিনিট

---

## 📏 File Size

- Installer: ~80-120 MB
- এটি normal (Electron + Node.js included)

---

## 🐛 সমস্যা হলে?

### "EBUSY: resource busy" Error (সবচেয়ে common):
```bash
# Quick fix
stop-processes.bat

# অথবা complete fix
fix-and-build.bat
```

### Build fail হলে:
```bash
npm install
npm rebuild better-sqlite3
npm run package:win
```

### Icon দেখাচ্ছে না:
```bash
npm run icon:check
```

### সব কিছু fail হলে:
1. Computer restart করুন
2. Fresh terminal খুলুন
3. Run করুন: `fix-and-build.bat`

---

## 📚 আরও তথ্যের জন্য

- **Quick Guide**: `QUICK_BUILD_GUIDE.md`
- **Detailed Guide**: `BUILD_INSTRUCTIONS.md`
- **Setup Complete**: `INSTALLER_SETUP_COMPLETE.md`

---

## ✨ Ready to Build?

```bash
# Option 1: NPM
npm run package:win

# Option 2: Batch file
build-installer.bat
```

**Happy Building! 🚀**
