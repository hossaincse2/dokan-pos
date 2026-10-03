# Windows Installer তৈরির নির্দেশনা

## Prerequisites
- Node.js এবং npm installed থাকতে হবে
- Dependencies install করা থাকতে হবে: `npm install`

## Icon Setup (Optional)
আপনার নিজের icon ব্যবহার করতে চাইলে:
1. একটি 512x512 বা 256x256 PNG image তৈরি করুন
2. এটি `assets/icon.png` হিসেবে save করুন
3. .ico file এর জন্য online converter ব্যবহার করতে পারেন (যেমন: convertio.co)

## Build Commands

### 1. Development Build Test
```bash
npm run build
```

### 2. Windows Installer তৈরি করুন
```bash
npm run package:win
```

এটি তৈরি করবে:
- **NSIS Installer** (Setup.exe) - `release/Karbar POS-Setup-1.0.0.exe`
- **Portable Version** (.exe) - `release/Karbar POS-Portable-1.0.0.exe`

### 3. শুধু NSIS Installer
```bash
npm run build && npx electron-builder --win nsis
```

### 4. শুধু Portable Version
```bash
npm run build && npx electron-builder --win portable
```

## Output Location
Build হওয়ার পর files পাবেন:
```
release/
  ├── Karbar POS-Setup-1.0.0.exe      (Installer - 80-120 MB)
  └── Karbar POS-Portable-1.0.0.exe   (Portable - 80-120 MB)
```

## Installer Features
- ✅ Desktop shortcut তৈরি করবে
- ✅ Start Menu shortcut তৈরি করবে
- ✅ Installation directory পরিবর্তন করা যাবে
- ✅ Install করার পর automatically run হবে
- ✅ Uninstaller included
- ✅ 32-bit এবং 64-bit support

## Troubleshooting

### Error: "EBUSY: resource busy or locked" ⚠️
এটি সবচেয়ে common error। Fix করুন:

**Quick Fix:**
```bash
stop-processes.bat
```
তারপর আবার build করুন।

**Complete Fix:**
```bash
fix-and-build.bat
```
এটি automatically সব fix করে build করবে।

**Manual Fix:**
1. সব Electron app বন্ধ করুন
2. VS Code বন্ধ করুন
3. Task Manager এ electron.exe এবং node.exe kill করুন
4. Fresh terminal খুলে run করুন: `npm run package:win`

### Error: "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
npm run package:win
```

### Build size বড় হলে
এটি normal - Electron runtime + Node modules সহ 80-120 MB হতে পারে।

### Icon দেখাচ্ছে না
1. `assets/icon.png` file আছে কিনা check করুন
2. Icon size 256x256 বা 512x512 হতে হবে
3. PNG format হতে হবে

### Build খুব slow
- First build: 5-10 minutes (normal)
- পরবর্তী builds: 2-3 minutes
- SSD ব্যবহার করলে দ্রুত হবে

## Production Build Checklist
- [ ] `.env` file এ production API URL set করুন
- [ ] `package.json` এ version number update করুন
- [ ] Icon file ready আছে
- [ ] Build test করুন: `npm run build`
- [ ] Installer তৈরি করুন: `npm run package:win`
- [ ] Installer test করুন একটি clean machine এ

## Version Update
`package.json` এ version change করুন:
```json
{
  "version": "1.0.1"
}
```

তারপর rebuild করুন।
