const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Determine database path (same as Electron's userData)
const appName = 'karbar-pos';
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', appName);
const dbPath = path.join(userDataPath, 'data', 'pos.db');

console.log('📦 Database path:', dbPath);

if (!require('fs').existsSync(dbPath)) {
  console.error('❌ Database not found! Please start the app first to create the database.');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('🗑️  Clearing existing products...');
db.prepare('DELETE FROM products').run();

console.log('🌱 Seeding mock products...');

const insertProduct = db.prepare(`
  INSERT INTO products (
    product_id, sku_code, product_name, unit_price, sale_price,
    final_sale_price, variant_id, variant_sku, variant_attributes,
    additional_price, available_stock, preview_image, image_preview_style,
    store_id, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const mockProducts = [
  [1, 'DELL-XPS-15', 'Laptop Dell XPS 15', 1299.99, 1199.99, 1199.99, null, null, null, null, 15, null, 'default', 2, new Date().toISOString()],
  [2, 'LOG-MX-MASTER', 'Wireless Mouse Logitech', 79.99, 74.99, 74.99, null, null, null, null, 50, null, 'default', 2, new Date().toISOString()],
  [3, 'CHAIR-PREM-001', 'Office Chair Premium', 299.99, 279.99, 279.99, null, null, null, null, 8, null, 'default', 2, new Date().toISOString()],
  [4, 'CABLE-USBC-2M', 'USB-C Cable 2m', 12.99, 12.99, 12.99, null, null, null, null, 100, null, 'default', 2, new Date().toISOString()],
  [5, 'NOTE-A4-RULED', 'Notebook A4 Ruled', 3.99, 3.99, 3.99, null, null, null, null, 200, null, 'default', 2, new Date().toISOString()],
  [6, 'KB-MECH-RGB', 'Mechanical Keyboard RGB', 149.99, 139.99, 139.99, null, null, null, null, 25, null, 'default', 2, new Date().toISOString()],
  [7, 'MON-27-4K', 'Monitor 27" 4K', 449.99, 429.99, 429.99, null, null, null, null, 12, null, 'default', 2, new Date().toISOString()],
  [8, 'LAMP-LED-DESK', 'Desk Lamp LED', 39.99, 39.99, 39.99, null, null, null, null, 30, null, 'default', 2, new Date().toISOString()],
  [9, 'PEN-BLUE-10', 'Pen Set Blue 10pcs', 5.99, 5.99, 5.99, null, null, null, null, 150, null, 'default', 2, new Date().toISOString()],
  [10, 'CAM-HD-1080', 'Webcam HD 1080p', 89.99, 84.99, 84.99, null, null, null, null, 20, null, 'default', 2, new Date().toISOString()],
  [11, 'HEAD-WIRELESS', 'Headphones Wireless', 199.99, 189.99, 189.99, null, null, null, null, 35, null, 'default', 2, new Date().toISOString()],
  [12, 'DESK-STAND-ADJ', 'Standing Desk Adjustable', 599.99, 549.99, 549.99, null, null, null, null, 5, null, 'default', 2, new Date().toISOString()],
  [13, 'PHONE-HOLDER', 'Phone Holder Adjustable', 19.99, 19.99, 19.99, null, null, null, null, 75, null, 'default', 2, new Date().toISOString()],
  [14, 'HDMI-CABLE-3M', 'HDMI Cable 3m', 15.99, 14.99, 14.99, null, null, null, null, 60, null, 'default', 2, new Date().toISOString()],
  [15, 'BACKPACK-LAPTOP', 'Laptop Backpack', 59.99, 54.99, 54.99, null, null, null, null, 40, null, 'default', 2, new Date().toISOString()],
  [16, 'MOUSE-PAD-XL', 'Extra Large Mouse Pad', 24.99, 22.99, 22.99, null, null, null, null, 45, null, 'default', 2, new Date().toISOString()],
  [17, 'WEBCAM-COVER', 'Webcam Privacy Cover', 4.99, 4.99, 4.99, null, null, null, null, 120, null, 'default', 2, new Date().toISOString()],
  [18, 'USB-HUB-4PORT', 'USB Hub 4 Port', 29.99, 27.99, 27.99, null, null, null, null, 55, null, 'default', 2, new Date().toISOString()],
  [19, 'SCREEN-CLEANER', 'Screen Cleaning Kit', 9.99, 9.99, 9.99, null, null, null, null, 80, null, 'default', 2, new Date().toISOString()],
  [20, 'CABLE-ORGANIZER', 'Cable Management Box', 14.99, 13.99, 13.99, null, null, null, null, 65, null, 'default', 2, new Date().toISOString()],
];

const seedProducts = db.transaction((products) => {
  for (const product of products) {
    insertProduct.run(...product);
  }
});

seedProducts(mockProducts);

const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
console.log(`✅ Successfully seeded ${count.count} products!`);

// Also seed some categories
console.log('🌱 Seeding categories...');
db.prepare('DELETE FROM categories').run();

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, description) VALUES (?, ?, ?)
`);

const categories = [
  [1, 'Electronics', 'Electronic devices and accessories'],
  [2, 'Furniture', 'Office and home furniture'],
  [3, 'Stationery', 'Office supplies and stationery'],
];

const seedCategories = db.transaction((cats) => {
  for (const cat of cats) {
    insertCategory.run(...cat);
  }
});

seedCategories(categories);

console.log(`✅ Successfully seeded ${categories.length} categories!`);

db.close();
console.log('✅ Mock data seeding complete!');
console.log('🔄 Please restart your Electron app to see the products.');
