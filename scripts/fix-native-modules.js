const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Fixing Native Modules (better-sqlite3) ---');

try {
    console.log('Step 1: Removing old build cache...');
    const sqliteBuildPath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build');
    if (fs.existsSync(sqliteBuildPath)) {
        fs.rmSync(sqliteBuildPath, { recursive: true, force: true });
        console.log('✅ Cleaned better-sqlite3 build folder.');
    }

    console.log('Step 2: Rebuilding native modules for Electron...');
    // This command is the most reliable way to fix the "not a valid Win32 application" error
    execSync('npx electron-builder install-app-deps', { stdio: 'inherit' });
    
    console.log('\n✅ SUCCESS! Native modules have been rebuilt.');
    console.log('You can now run: npm run dev');
} catch (error) {
    console.error('\n❌ Failed to rebuild native modules.');
    console.error('Try running: npm install');
    process.exit(1);
}
