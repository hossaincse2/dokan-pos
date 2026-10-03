const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine the user data path based on OS
const getUserDataPath = () => {
  const platform = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE;
  
  if (platform === 'win32') {
    return path.join(process.env.APPDATA, 'karbar-pos');
  } else if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'karbar-pos');
  } else {
    return path.join(home, '.config', 'karbar-pos');
  }
};

const userDataPath = getUserDataPath();
const dataDir = path.join(userDataPath, 'data');
const dbPath = path.join(dataDir, 'pos.db');

console.log('🗄️  Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found. It will be created on next app start.');
  process.exit(0);
}

try {
  const db = new Database(dbPath);
  
  console.log('📊 Checking database schema...');
  
  // Check if store_id column exists
  const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
  const hasStoreId = tableInfo.some(col => col.name === 'store_id');
  
  if (!hasStoreId) {
    console.log('➕ Adding store_id column to orders table...');
    db.exec(`
      ALTER TABLE orders ADD COLUMN store_id INTEGER NOT NULL DEFAULT 2;
    `);
    console.log('✅ store_id column added successfully');
  } else {
    console.log('✅ store_id column already exists');
  }
  
  // Check other potential missing columns
  const hasSubTotal = tableInfo.some(col => col.name === 'sub_total');
  const hasDiscountAmount = tableInfo.some(col => col.name === 'discount_amount');
  const hasVatAmount = tableInfo.some(col => col.name === 'vat_amount');
  const hasTotalAmount = tableInfo.some(col => col.name === 'total_amount');
  const hasPaidAmount = tableInfo.some(col => col.name === 'paid_amount');
  const hasChangeAmount = tableInfo.some(col => col.name === 'change_amount');
  
  if (!hasSubTotal) {
    console.log('➕ Adding sub_total column...');
    db.exec(`ALTER TABLE orders ADD COLUMN sub_total REAL NOT NULL DEFAULT 0;`);
  }
  
  if (!hasDiscountAmount) {
    console.log('➕ Adding discount_amount column...');
    db.exec(`ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;`);
  }
  
  if (!hasVatAmount) {
    console.log('➕ Adding vat_amount column...');
    db.exec(`ALTER TABLE orders ADD COLUMN vat_amount REAL DEFAULT 0;`);
  }
  
  if (!hasTotalAmount) {
    console.log('➕ Adding total_amount column...');
    db.exec(`ALTER TABLE orders ADD COLUMN total_amount REAL NOT NULL DEFAULT 0;`);
  }
  
  if (!hasPaidAmount) {
    console.log('➕ Adding paid_amount column...');
    db.exec(`ALTER TABLE orders ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0;`);
  }
  
  if (!hasChangeAmount) {
    console.log('➕ Adding change_amount column...');
    db.exec(`ALTER TABLE orders ADD COLUMN change_amount REAL DEFAULT 0;`);
  }
  
  // Check order_items table
  const orderItemsInfo = db.prepare("PRAGMA table_info(order_items)").all();
  const hasProductVariantId = orderItemsInfo.some(col => col.name === 'product_variant_id');
  
  if (!hasProductVariantId) {
    console.log('➕ Adding product_variant_id column to order_items...');
    db.exec(`ALTER TABLE order_items ADD COLUMN product_variant_id INTEGER;`);
  }
  
  db.close();
  
  console.log('');
  console.log('✨ Database migration completed successfully!');
  console.log('You can now restart the application.');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('');
  console.log('💡 Solution: Delete the database and let it recreate:');
  console.log('   Database location:', dbPath);
  process.exit(1);
}
