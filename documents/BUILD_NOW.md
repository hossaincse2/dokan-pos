# 🚀 এখনই Build করুন!

## ⚡ Quick Start (3 Steps)

### Step 1: Processes বন্ধ করুন
```bash
stop-processes.bat
```

### Step 2: Build করুন
```bash
npm run package:win
```

### Step 3: Done! 🎉
```
release/Karbar POS-Setup-1.0.0.exe
```

---

## 🔧 Error হলে?

### "EBUSY: resource busy" দেখাচ্ছে?
```bash
fix-and-build.bat
```
এটি automatically সব fix করবে!

---

## 📦 Build Scripts

| Script | কাজ |
|--------|-----|
| `stop-processes.bat` | Electron/Node বন্ধ করবে |
| `build-installer.bat` | Normal build |
| `fix-and-build.bat` | Fix + Build |

---

## ✅ সবচেয়ে নিরাপদ উপায়:

1. **সব বন্ধ করুন:**
   - VS Code
   - Electron app
   - All terminals

2. **Fresh PowerShell খুলুন**

3. **Run করুন:**
   ```bash
   cd "C:\Users\DELL-PC\Desktop\database design\electron-pos-fixed"
   npm run package:win
   ```

4. **অপেক্ষা করুন:** 3-5 মিনিট

5. **Done!** `release/` folder check করুন

---

## 🎯 One-Click Solution

Computer restart করতে না চাইলে:
```bash
fix-and-build.bat
```

---

## 📝 Important Notes:

- ✅ Dev server বন্ধ রাখুন
- ✅ Fresh terminal ব্যবহার করুন
- ✅ Administrator হিসেবে run করুন (optional)
- ❌ Multiple builds একসাথে করবেন না

---

**Ready? Double-click:** `fix-and-build.bat` 🚀
