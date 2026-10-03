# 🔧 Build Error Fix - better-sqlite3 Lock Issue

## সমস্যা:
`EBUSY: resource busy or locked` - better_sqlite3.node file locked

## সমাধান:

### Step 1: সব বন্ধ করুন
1. **Electron app বন্ধ করুন** (যদি চলমান থাকে)
2. **VS Code বন্ধ করুন** (important!)
3. **Command Prompt/PowerShell বন্ধ করুন**
4. **Task Manager** খুলে check করুন:
   - `electron.exe` running আছে কিনা → End Task
   - `node.exe` running আছে কিনা → End Task

### Step 2: node_modules Clean করুন
```bash
# PowerShell এ run করুন (Administrator হিসেবে)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
```

### Step 3: Fresh Install
```bash
npm install
```

### Step 4: Build করুন
```bash
npm run package:win
```

---

## 🚀 Quick Fix (One Command)

PowerShell এ (Administrator):
```powershell
taskkill /F /IM electron.exe 2>$null; taskkill /F /IM node.exe 2>$null; Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue; Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue; npm install; npm run package:win
```

---

## 🔄 Alternative: Restart করুন

সবচেয়ে সহজ:
1. **Computer restart করুন**
2. Fresh terminal খুলুন
3. Run করুন:
```bash
npm install
npm run package:win
```

---

## ⚠️ এড়িয়ে চলুন:

- ❌ Dev server চালু রেখে build করবেন না
- ❌ Multiple terminals এ একসাথে build করবেন না
- ❌ VS Code terminal থেকে build করার সময় app চালাবেন না

---

## ✅ সঠিক Process:

1. সব app/terminal বন্ধ করুন
2. Fresh PowerShell খুলুন
3. Project folder এ যান
4. Run করুন: `npm run package:win`
5. অপেক্ষা করুন (3-5 মিনিট)

---

## 🎯 Still Not Working?

### Nuclear Option (সব clean করুন):
```bash
# 1. Stop all processes
taskkill /F /IM electron.exe
taskkill /F /IM node.exe

# 2. Delete everything
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
Remove-Item -Force package-lock.json

# 3. Fresh start
npm cache clean --force
npm install
npm run build
npm run package:win
```

---

## 📝 Notes:

- এই error সাধারণত হয় যখন electron app চলমান থাকে
- Windows file locking এর কারণে হয়
- Restart করলে সাধারণত solve হয়ে যায়

---

**Ready? Close everything and try again!** 🚀
