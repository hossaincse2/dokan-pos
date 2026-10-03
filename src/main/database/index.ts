import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbPath = path.join(dataDir, 'pos.db');
  }

  public initialize(): void {
    if (this.db) return;

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = OFF'); // Disable foreign key constraints
    
    this.runMigrations();
    
    // Enforce variant barcode rules on startup
    this.enforceBarcodeRules();
    
    // Update API base URL from environment if not set
    this.updateApiBaseUrlFromEnv();
  }

  private updateApiBaseUrlFromEnv(): void {
    try {
      const db = this.getDatabase();
      // Check if we already have a URL in the database
      const settings = db.prepare('SELECT api_base_url FROM app_settings WHERE id = 1').get() as any;
      
      // Priority: 
      // 1. Explicit Environment Variable (API_BASE_URL)
      // 2. Existing Database Setting
      // 3. Default Fallback
      
      const envBaseUrl = process.env.API_BASE_URL;
      const currentDbUrl = settings?.api_base_url;
      
      if (envBaseUrl) {
        // Only update if it's different to avoid unnecessary writes
        if (envBaseUrl !== currentDbUrl) {
          db.prepare('UPDATE app_settings SET api_base_url = ? WHERE id = 1').run(envBaseUrl);
          console.log('[Database] Updated API base URL from Environment:', envBaseUrl);
        }
      } else if (!currentDbUrl || currentDbUrl === '') {
        // Only set default if currently empty or null
        const defaultUrl = 'http://127.0.0.1:8000';
        db.prepare('UPDATE app_settings SET api_base_url = ? WHERE id = 1').run(defaultUrl);
        console.log('[Database] Set initial default API base URL:', defaultUrl);
      } else {
        console.log('[Database] Using existing API base URL:', currentDbUrl);
      }
    } catch (error) {
      console.error('[Database] Error updating API base URL from environment:', error);
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private runMigrations(): void {
    const db = this.getDatabase();
    
    // Create meta table first
    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    const versionRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as { value: string } | undefined;
    const currentVersion = versionRow ? parseInt(versionRow.value) : 0;

    const migrations = this.getMigrations();
    
    for (let i = currentVersion; i < migrations.length; i++) {
      console.log(`[Database] Running migration ${i + 1}/${migrations.length}...`);
      
      try {
        db.exec(migrations[i]);
      } catch (error: any) {
        // Skip duplicate column/table errors - this happens if Migration 1 was updated
        // to include columns that are also added in later migration steps.
        if (error.message && (
          error.message.includes('duplicate column name') || 
          error.message.includes('already exists')
        )) {
          console.warn(`[Database] Migration ${i + 1} skipped: Structure already exists.`);
        } else {
          console.error(`[Database] Migration ${i + 1} CRITICAL FAILURE:`, error);
          throw error;
        }
      }
      
      db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('schema_version', (i + 1).toString());
    }
  }

  private getMigrations(): string[] {
    return [
      // Migration 1: Initial schema
      `
        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          remote_id INTEGER UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Stores table
        CREATE TABLE IF NOT EXISTS stores (
          id INTEGER PRIMARY KEY,
          remote_id INTEGER UNIQUE,
          name TEXT NOT NULL,
          location TEXT,
          address TEXT,
          is_default INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Products table
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          sku_code TEXT NOT NULL UNIQUE,
          barcode TEXT,
          product_name TEXT NOT NULL,
          product_type TEXT DEFAULT 'general',
          brand_id INTEGER,
          unit_price REAL NOT NULL,
          sale_price REAL DEFAULT 0,
          retailer_price REAL DEFAULT 0,
          final_sale_price REAL DEFAULT 0,
          cost REAL DEFAULT 0,
          variant_id INTEGER,
          variant_sku TEXT,
          variant_attributes TEXT,
          additional_price REAL,
          available_stock INTEGER NOT NULL DEFAULT 0,
          preview_image TEXT,
          image_preview_style TEXT,
          category_id INTEGER,
          store_id INTEGER,
          remote_id INTEGER,
          vat_percentage REAL DEFAULT 0,
          vat_sales_price REAL DEFAULT 0,
          vat_price REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          remote_id INTEGER UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Employees table
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id INTEGER UNIQUE,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          role TEXT,
          status TEXT,
          join_date TEXT,
          address TEXT,
          basic_salary REAL DEFAULT 0,
          allowance REAL DEFAULT 0,
          salary_effective_date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Users table (for login credentials and tokens)
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          username TEXT,
          password_hash TEXT,
          role TEXT,
          status TEXT DEFAULT 'active',
          last_login_at TEXT,
          token TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Orders table
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          local_id TEXT NOT NULL UNIQUE,
          remote_id INTEGER UNIQUE,
          customer_id INTEGER,
          customer_name TEXT,
          store_id INTEGER NOT NULL DEFAULT 1,
          sub_total REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          discount_type TEXT DEFAULT 'flat',
          vat TEXT DEFAULT '0',
          vat_amount REAL DEFAULT 0,
          total_quantity INTEGER NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          paid_amount REAL NOT NULL,
          change_amount REAL DEFAULT 0,
          payment_status TEXT NOT NULL DEFAULT 'pending',
          status TEXT NOT NULL DEFAULT 'draft',
          order_type TEXT DEFAULT 'pos',
          shipping_address TEXT,
          note TEXT,
          billed_by INTEGER NOT NULL,
          transaction_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (store_id) REFERENCES stores(id)
        );

        -- Order items table
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          order_local_id TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          product_variant_id INTEGER,
          sku_code TEXT NOT NULL,
          variant_attributes TEXT,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          total REAL NOT NULL,
          vat_percentage REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );

        -- Sync queue table
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          entity_local_id TEXT NOT NULL,
          action TEXT NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          last_attempt_at TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        -- App settings table
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          api_base_url TEXT,
          store_id INTEGER DEFAULT 1,
          auto_sync_enabled INTEGER DEFAULT 1,
          sync_interval_minutes INTEGER DEFAULT 5,
          tax_rate REAL DEFAULT 0.15,
          receipt_company_name TEXT DEFAULT 'Your Company',
          receipt_company_address TEXT DEFAULT '',
          receipt_company_phone TEXT DEFAULT '',
          low_stock_threshold INTEGER DEFAULT 10,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Site settings table
        CREATE TABLE IF NOT EXISTS site_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          title TEXT,
          phone TEXT,
          email TEXT,
          whatsapp_id TEXT,
          website TEXT,
          facebook_url TEXT,
          youtube_url TEXT,
          vat TEXT,
          tax TEXT,
          address TEXT,
          company_name TEXT,
          vat_number TEXT,
          cr_number TEXT,
          tin_no TEXT,
          currency TEXT DEFAULT 'bdt',
          currency_icon TEXT DEFAULT '৳',
          invoice_logo TEXT,
          signature TEXT,
          header_logo TEXT,
          footer_logo TEXT,
          fev_icon TEXT,
          invoice_footer_note TEXT,
          qr_code_enabled INTEGER DEFAULT 1,
          qr_code_size INTEGER DEFAULT 120,
          qr_code_margin INTEGER DEFAULT 1,
          zatca_phase INTEGER DEFAULT 1,
          invoice_show_format TEXT DEFAULT 'pos_format',
          country_code TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Sync history table
        CREATE TABLE IF NOT EXISTS sync_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          status TEXT NOT NULL,
          items_pushed INTEGER DEFAULT 0,
          items_pulled INTEGER DEFAULT 0,
          error_message TEXT
        );

        -- Payment methods table
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          remote_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Expenses table
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id INTEGER UNIQUE,
          type TEXT NOT NULL,
          category TEXT,
          amount REAL NOT NULL,
          expense_date TEXT NOT NULL,
          description TEXT,
          expense_by INTEGER,
          expense_by_name TEXT,
          store_id INTEGER,
          is_petty_cash INTEGER DEFAULT 0,
          is_synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku_code);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
        CREATE INDEX IF NOT EXISTS idx_products_stock ON products(available_stock);
        CREATE INDEX IF NOT EXISTS idx_orders_local_id ON orders(local_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced_at);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at);

        -- Insert default settings (API base URL and store ID come from environment)
        INSERT OR IGNORE INTO app_settings (id, store_id) VALUES (1, ${process.env.VITE_DEFAULT_STORE_ID || 1});

        -- Insert default guest customer
        INSERT OR IGNORE INTO customers (id, name, email, phone) 
        VALUES (1, 'Walk in Customer', NULL, NULL);
      `,
      // Migration 2: Add salesman_id column to orders table
      `
        -- Add salesman_id column if it doesn't exist
        ALTER TABLE orders ADD COLUMN salesman_id INTEGER;
        
        -- Update existing orders to set salesman_id = billed_by
        UPDATE orders SET salesman_id = billed_by WHERE salesman_id IS NULL;
      `,
      // Migration 3: Add show_stock_badge column
      `ALTER TABLE app_settings ADD COLUMN show_stock_badge INTEGER DEFAULT 1;`,
      // Migration 4: Add show_product_title column
      `ALTER TABLE app_settings ADD COLUMN show_product_title INTEGER DEFAULT 1;`,
      // Migration 5: Add show_product_price column
      `ALTER TABLE app_settings ADD COLUMN show_product_price INTEGER DEFAULT 1;`,
      // Migration 6: Add show_sale_modal column
      `ALTER TABLE app_settings ADD COLUMN show_sale_modal INTEGER DEFAULT 1;`,
      // Migration 7: Add ZATCA settings
      `ALTER TABLE app_settings ADD COLUMN zatca_phase INTEGER DEFAULT 1;`,
      `ALTER TABLE app_settings ADD COLUMN vat_registration_number TEXT;`,
      `ALTER TABLE app_settings ADD COLUMN commercial_registration_number TEXT;`,
      // Migration 8: Add country column
      `ALTER TABLE app_settings ADD COLUMN country TEXT DEFAULT 'Bangladesh';`,
      // Migration 9: Add QR and ZATCA settings to site_settings
      `ALTER TABLE site_settings ADD COLUMN qr_code_margin INTEGER DEFAULT 1;`,
      `ALTER TABLE site_settings ADD COLUMN zatca_phase INTEGER DEFAULT 1;`,
      // Migration 10: Add additional regional tax fields
      `ALTER TABLE app_settings ADD COLUMN bin_number TEXT;`,
      `ALTER TABLE app_settings ADD COLUMN uae_trn TEXT;`,
      `ALTER TABLE app_settings ADD COLUMN kuwait_tax_id TEXT;`,
      // Migration 11: Add QR code customization to app_settings
      `ALTER TABLE app_settings ADD COLUMN qr_code_size INTEGER DEFAULT 120;`,
      `ALTER TABLE app_settings ADD COLUMN qr_code_margin INTEGER DEFAULT 1;`,
      // Migration 12: Add is_tax_inclusive column
      `ALTER TABLE app_settings ADD COLUMN is_tax_inclusive INTEGER DEFAULT 0;`,
      // Migration 13: Add is_tax_inclusive column to orders table
      `ALTER TABLE orders ADD COLUMN is_tax_inclusive INTEGER DEFAULT 0;`,
      // Migration 14: Add VAT fields to products table
      `ALTER TABLE products ADD COLUMN vat_percentage REAL DEFAULT 0;`,
      `ALTER TABLE products ADD COLUMN vat_sales_price REAL DEFAULT 0;`,
      `ALTER TABLE products ADD COLUMN vat_price REAL DEFAULT 0;`,
      // Migration 15: Add vat_percentage to order_items table
      `ALTER TABLE order_items ADD COLUMN vat_percentage REAL DEFAULT 0;`,
      // Migration 16: Create payment_methods table if not exists (for existing databases)
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        remote_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
      // Migration 17: Create expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        remote_id INTEGER UNIQUE,
        type TEXT NOT NULL,
        category TEXT,
        amount REAL NOT NULL,
        expense_date TEXT NOT NULL,
        description TEXT,
        expense_by INTEGER,
        expense_by_name TEXT,
        store_id INTEGER,
        is_petty_cash INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
      // Migration 18: Remove static placeholder Main Store
      `DELETE FROM stores WHERE name = 'Main Store' AND (remote_id IS NULL OR remote_id = 0);`,
      // Migration 19: Create purchases table for local stock purchase orders
      `CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        remote_id INTEGER UNIQUE,
        challan_no TEXT,
        supplier_name TEXT,
        status TEXT DEFAULT 'Received',
        purchase_type TEXT DEFAULT 'Local',
        total_quantity INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        store_id INTEGER DEFAULT 1,
        purchase_date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
      CREATE INDEX IF NOT EXISTS idx_purchases_remote_id ON purchases(remote_id);`,
    ];
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public reset(): void {
    console.log('[Database] Resetting database but preserving all app settings...');
    
    let savedSettings: any = null;
    
    try {
      // Try to save all settings before we delete the database
      if (this.db) {
        savedSettings = this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
        console.log('[Database] Settings backed up successfully.');
      }
    } catch (e) {
      console.log('[Database] Could not backup settings during reset, will use defaults');
    }

    this.close();
    
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
      console.log('[Database] Old database file deleted.');
    }
    
    // Re-initialize (creates fresh schema and default settings row)
    this.initialize();

    // Restore the saved settings if we have them
    if (savedSettings && this.db) {
      try {
        // Remove 'id' and 'created_at' if they exist to avoid conflicts or use UPDATE
        const { id, created_at, updated_at, ...settingsToRestore } = savedSettings;
        
        const keys = Object.keys(settingsToRestore);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const values = keys.map(key => settingsToRestore[key]);
        
        if (keys.length > 0) {
          this.db.prepare(`UPDATE app_settings SET ${setClause}, updated_at = ? WHERE id = 1`)
            .run(...values, new Date().toISOString());
          console.log('[Database] All app settings restored successfully.');
        }
      } catch (e) {
        console.error('[Database] Failed to restore app settings:', e);
      }
    }
  }

  public enforceBarcodeRules(): void {
    const db = this.getDatabase();
    try {
      // NOTE: The API now returns the correct rule-compliant barcode (sku_barcode) as the `barcode`
      // field for each product/variant. This function is kept as a LOCAL SAFETY NET only —
      // it should NOT override barcodes that the API already provided correctly.
      // It only fills in barcodes that are missing/empty after sync.
      console.log('[Database] 🛡️ Safety-net barcode check (API barcodes are authoritative)...');
      
      const products = db.prepare('SELECT id, product_id, variant_id, sku_code, barcode, final_sale_price, sale_price, unit_price FROM products').all() as any[];
      
      if (products.length === 0) return;

      const updates: { id: number, barcode: string }[] = [];
      
      // Group by product_id
      const productGroups = new Map<number, any[]>();
      for (const p of products) {
        const groupId = p.product_id;
        if (!productGroups.has(groupId)) productGroups.set(groupId, []);
        productGroups.get(groupId)!.push(p);
      }

      for (const [, group] of productGroups.entries()) {
        // Determine the "parent" row's barcode (variant_id is null = parent/non-variant row)
        const parentRow = group.find(p => !p.variant_id) || group[0];
        const baseBarcode = parentRow.barcode || parentRow.sku_code;

        for (const p of group) {
          // Only fix rows that are completely missing a barcode
          if (!p.barcode) {
            updates.push({ id: p.id, barcode: baseBarcode || p.sku_code });
          }
        }
      }

      if (updates.length > 0) {
        console.log(`[Database] 🔄 Safety-net: filling ${updates.length} missing barcodes...`);
        const updateStmt = db.prepare('UPDATE products SET barcode = ? WHERE id = ?');
        db.transaction((list: { id: number, barcode: string }[]) => {
          for (const item of list) updateStmt.run(item.barcode, item.id);
        })(updates);
        console.log('[Database] ✅ Missing barcodes filled.');
      } else {
        console.log('[Database] ✅ All barcodes present — no safety-net action needed.');
      }
    } catch (error) {
      console.error('[Database] Failed to enforce barcode rules:', error);
    }
  }

  public exportDatabase(exportPath: string): void {
    const db = this.getDatabase();
    db.backup(exportPath);
  }

  public importDatabase(importPath: string): void {
    this.close();
    fs.copyFileSync(importPath, this.dbPath);
    this.initialize();
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}
