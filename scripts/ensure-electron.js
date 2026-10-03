const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isExeArchitectureValid(exePath, expectedArch) {
    if (!fs.existsSync(exePath)) return false;
    try {
        const buf = fs.readFileSync(exePath);
        const peOffset = buf.readUInt32LE(0x3c);
        const machine = buf.readUInt16LE(peOffset + 4);
        // 0x8664 is x64, 0x14c is ia32
        if (expectedArch === 'x64' && machine === 0x8664) return true;
        if (expectedArch === 'ia32' && machine === 0x14c) return true;
        console.warn(`[ensure-electron] Mismatch: electron.exe machine is 0x${machine.toString(16)}, expected ${expectedArch}`);
        return false;
    } catch (e) {
        return false;
    }
}

function ensureElectron() {
    const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
    const pathTxt = path.join(electronDir, 'path.txt');
    const electronExe = path.join(electronDir, 'dist', 'electron.exe');
    const targetArch = process.arch; // 'x64'

    if (fs.existsSync(pathTxt) && isExeArchitectureValid(electronExe, targetArch)) {
        return;
    }

    console.log(`[ensure-electron] Setting up Electron binary for arch: ${targetArch}...`);

    const cacheRoot = path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local'), 'electron', 'Cache');
    
    // Find cached zip specifically for targetArch (e.g. x64)
    let zipPath = null;
    if (fs.existsSync(cacheRoot)) {
        const findZip = (dir) => {
            const files = fs.readdirSync(dir);
            for (const f of files) {
                const full = path.join(dir, f);
                if (fs.statSync(full).isDirectory()) {
                    findZip(full);
                } else if (f.startsWith('electron-v29') && f.includes(`win32-${targetArch}`) && f.endsWith('.zip')) {
                    zipPath = full;
                    return;
                }
            }
        };
        findZip(cacheRoot);
    }

    const distDir = path.join(electronDir, 'dist');
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });

    if (zipPath && fs.existsSync(zipPath)) {
        console.log(`[ensure-electron] Extracting architecture-matching zip: ${zipPath}`);
        if (process.platform === 'win32') {
            execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${distDir}' -Force"`, { stdio: 'inherit' });
        }
    } else {
        console.log('[ensure-electron] Running standard electron install.js...');
        try {
            execSync('node ' + path.join(electronDir, 'install.js'), { stdio: 'inherit' });
        } catch (e) {
            console.warn('[ensure-electron] install.js failed or skipped, checking again...');
        }
    }

    if (fs.existsSync(electronExe)) {
        fs.writeFileSync(pathTxt, 'electron.exe');
        console.log('[ensure-electron] Created path.txt successfully.');
    }
}

try {
    ensureElectron();
} catch (err) {
    console.error('[ensure-electron] Error:', err.message);
}
