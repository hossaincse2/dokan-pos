const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path (matches Electron's userData path)
const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'karbar-pos')
  : path.join(process.env.HOME, '.config', 'karbar-pos');
const dbPath = path.join(userDataPath, 'data', 'pos.db');

console.log('📍 Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found. Please run the app first.');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  console.log('🗑️  Clearing products table...');
  db.prepare('DELETE FROM products').run();
  
  console.log('🗑️  Clearing sync history...');
  db.prepare('DELETE FROM sync_history').run();
  
  console.log('🗑️  Clearing last sync timestamp...');
  db.prepare('DELETE FROM meta WHERE key = "last_sync_at"').run();
  
  console.log('✅ Database cleared successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Restart the app');
  console.log('2. Login with your credentials');
  console.log('3. Go to Database menu > Sync from API');
  console.log('4. Products with images will be synced from admin.karbar.shop');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
