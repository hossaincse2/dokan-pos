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
  // Get count of pending items
  const pending = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL').get();
  console.log(`📊 Found ${pending.count} pending sync items`);
  
  // Clear sync queue
  console.log('🗑️  Clearing sync queue...');
  db.prepare('DELETE FROM sync_queue WHERE synced_at IS NULL').run();
  
  console.log('✅ Sync queue cleared successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Create a new order in the POS');
  console.log('2. Click Database > Sync from API');
  console.log('3. The order will be uploaded with the correct format');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
