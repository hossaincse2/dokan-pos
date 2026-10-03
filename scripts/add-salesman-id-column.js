const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share');
const dbPath = path.join(userDataPath, 'karbar-pos', 'pos.db');

console.log('🔧 Database Migration: Adding salesman_id column');
console.log('📁 Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file not found. Please run the app first to create the database.');
  process.exit(1);
}

try {
  const db = new Database(dbPath);
  
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
  const hasColumn = tableInfo.some(col => col.name === 'salesman_id');
  
  if (hasColumn) {
    console.log('✅ Column salesman_id already exists in orders table');
  } else {
    console.log('➕ Adding salesman_id column to orders table...');
    
    // Add the column
    db.prepare(`
      ALTER TABLE orders ADD COLUMN salesman_id INTEGER
    `).run();
    
    // Update existing rows to set salesman_id = billed_by
    const result = db.prepare(`
      UPDATE orders SET salesman_id = billed_by WHERE salesman_id IS NULL
    `).run();
    
    console.log(`✅ Column added successfully! Updated ${result.changes} existing orders.`);
  }
  
  // Verify the column exists
  const updatedTableInfo = db.prepare("PRAGMA table_info(orders)").all();
  console.log('\n📋 Orders table columns:');
  updatedTableInfo.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
  
  db.close();
  console.log('\n✅ Migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
