const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get the database path
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'karbar-pos', 'data');
const dbPath = path.join(userDataPath, 'pos.db');

console.log('📂 Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Show current settings
  console.log('\n📋 Current site settings:');
  const currentSettings = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  console.log(JSON.stringify(currentSettings, null, 2));
  
  // Clear site settings
  console.log('\n🗑️  Clearing site settings...');
  db.prepare('DELETE FROM site_settings WHERE id = 1').run();
  console.log('✅ Site settings cleared!');
  
  console.log('\n💡 Now run sync to fetch fresh settings from API');
  console.log('   You can sync from the app menu: Database > Sync from API');
  
  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure the app is closed before running this script');
}
