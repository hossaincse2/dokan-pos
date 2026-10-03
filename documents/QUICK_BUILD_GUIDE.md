# 🚀 Windows Installer তৈরি করুন - Quick Guide

## Step 1: Icon তৈরি করুন (Optional)
```bash
# Browser এ খুলুন
assets/create-icon.html
```
অথবা আপনার নিজের 512x512 PNG icon `assets/icon.png` হিসেবে রাখুন।

## Step 2: Build করুন
```bash
npm run package:win
```

## ⏱️ সময় লাগবে: 3-5 মিনিট

## 📦 Output পাবেন:
```
release/
  ├── Karbar POS-Setup-1.0.0.exe      ← এটি distribute করুন
  └── Karbar POS-Portable-1.0.0.exe   ← Portable version
```

## ✅ Done!
Installer file টি যেকোনো Windows PC তে install করা যাবে।

---

## 🔧 Advanced Options

### শুধু Installer (NSIS)
```bash
npm run build && npx electron-builder --win nsis
```

### শুধু Portable
```bash
npm run build && npx electron-builder --win portable
```

### Version Change করুন
`package.json` এ:
```json
"version": "1.0.1"
```

### Production API URL
`.env` file এ:
```
VITE_API_BASE_URL=https://your-production-api.com
```

---

## 📝 Notes
- First build এ dependencies download হবে (একবার)
- File size: ~80-120 MB (normal)
- Windows Defender warning আসতে পারে (code signing ছাড়া)
