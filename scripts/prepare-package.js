const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function cleanup() {
    console.log('--- Preparing for Production Package ---');
    console.log('Step 1: Closing active Electron processes to release file locks...');
    
    try {
        // Try to kill running electron or app instances to release better-sqlite3.node
        execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
        execSync('taskkill /F /IM "Karbar POS.exe" /T', { stdio: 'ignore' });
        console.log('Cleaned up active processes.');
    } catch (e) {
        // Ignore errors if no processes are found
        console.log('No active processes found or already closed.');
    }

    console.log('Step 2: Cleaning native module build cache...');
    const sqlitePath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build');
    if (fs.existsSync(sqlitePath)) {
        try {
            fs.rmSync(sqlitePath, { recursive: true, force: true });
            console.log('Removed old sqlite build cache.');
        } catch (e) {
            console.error('CRITICAL: Failed to remove sqlite build cache. Make sure all terminal tabs running "npm run dev" are CLOSED.');
            process.exit(1);
        }
    }

    console.log('Step 3: Verification complete.');
    console.log('Proceeding with build...');
}

cleanup();
