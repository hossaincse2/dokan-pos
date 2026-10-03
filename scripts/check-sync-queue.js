const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.local/share');
const dbPath = path.join(userDataPath, 'karbar-pos', 'pos.db');

console.log('🔍 Checking Sync Queue Status');
console.log('📁 Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file not found.');
  process.exit(1);
}

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Check sync queue
  console.log('\n📋 Sync Queue Status:');
  const queueItems = db.prepare(`
    SELECT 
      id,
      entity_type,
      entity_local_id,
      action,
      created_at,
      synced_at,
      attempts,
      error_message
    FROM sync_queue
    ORDER BY created_at DESC
    LIMIT 20
  `).all();
  
  if (queueItems.length === 0) {
    console.log('   ✅ Sync queue is empty (all synced)');
  } else {
    const pending = queueItems.filter(item => !item.synced_at);
    const synced = queueItems.filter(item => item.synced_at);
    
    console.log(`   📊 Total items: ${queueItems.length}`);
    console.log(`   ⏳ Pending: ${pending.length}`);
    console.log(`   ✅ Synced: ${synced.length}`);
    
    if (pending.length > 0) {
      console.log('\n   ⚠️ Pending Items:');
      pending.forEach(item => {
        console.log(`      - ${item.entity_type} (${item.entity_local_id.substring(0, 8)})`);
        console.log(`        Created: ${item.created_at}`);
        console.log(`        Attempts: ${item.attempts || 0}`);
        if (item.error_message) {
          console.log(`        Error: ${item.error_message}`);
        }
      });
    }
  }
  
  // Check orders
  console.log('\n📦 Orders Status:');
  const orders = db.prepare(`
    SELECT 
      id,
      local_id,
      customer_name,
      total_amount,
      created_at,
      synced_at,
      remote_id
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  
  if (orders.length === 0) {
    console.log('   ℹ️ No orders found');
  } else {
    const unsynced = orders.filter(o => !o.synced_at);
    const synced = orders.filter(o => o.synced_at);
    
    console.log(`   📊 Total orders: ${orders.length}`);
    console.log(`   ⏳ Unsynced: ${unsynced.length}`);
    console.log(`   ✅ Synced: ${synced.length}`);
    
    if (unsynced.length > 0) {
      console.log('\n   ⚠️ Unsynced Orders:');
      unsynced.forEach(order => {
        console.log(`      - Order #${order.local_id.substring(0, 8)}`);
        console.log(`        Customer: ${order.customer_name}`);
        console.log(`        Amount: ৳${order.total_amount}`);
        console.log(`        Created: ${order.created_at}`);
      });
    }
  }
  
  // Check if salesman_id column exists
  console.log('\n🔧 Database Schema Check:');
  const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
  const hasColumn = tableInfo.some(col => col.name === 'salesman_id');
  
  if (hasColumn) {
    console.log('   ✅ salesman_id column exists');
  } else {
    console.log('   ❌ salesman_id column is MISSING - run migration!');
  }
  
  db.close();
  console.log('\n✅ Check complete!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
