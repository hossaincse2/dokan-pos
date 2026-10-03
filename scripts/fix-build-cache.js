const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

async function fix() {
    const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
    const version = '2.6.0';
    const targetDir = path.join(cacheDir, `winCodeSign-${version}`);
    const zipPath = path.join(cacheDir, 'winCodeSign.7z');
    const mirrorUrl = 'https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
    const sevenZip = path.join(process.cwd(), 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

    console.log('--- Automated Build Cache Fix ---');
    
    // 1. Create cache dir
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 2. Download manually if not exists
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1000) {
        console.log(`Downloading tools from mirror: ${mirrorUrl}`);
        
        const download = (url) => {
            return new Promise((resolve, reject) => {
                https.get(url, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        console.log('Following redirect to:', response.headers.location);
                        download(response.headers.location).then(resolve).catch(reject);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download: ${response.statusCode}`));
                        return;
                    }

                    const file = fs.createWriteStream(zipPath);
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                    reject(err);
                });
            });
        };

        await download(mirrorUrl);
        console.log('Download complete.');
    }

    // 3. Extract while EXCLUDING darwin folder (which causes the symlink error)
    console.log('Extracting tools (excluding problematic files)...');
    try {
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
        fs.mkdirSync(targetDir, { recursive: true });

        // Use -x!darwin to exclude the mac folder which has restricted symlinks
        const cmd = `"${sevenZip}" x "${zipPath}" "-o${targetDir}" -x!darwin -y`;
        execSync(cmd, { stdio: 'inherit' });
        
        console.log('\n--- SUCCESS! ---');
        console.log('The build tools are now pre-installed.');
        console.log('You can now run: npm run package:win');
    } catch (error) {
        console.error('Extraction failed:', error.message);
    }
}

fix();
