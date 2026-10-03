import { getDatabaseService } from '../database';
import { getApiService } from './api.service';
import { SyncResult, SyncStatus } from '../../shared/types';
import { BrowserWindow } from 'electron';

export class SyncService {
  private isRunning: boolean = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {}

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  public async startSync(dryRun: boolean = false): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    // Check if database is initialized
    try {
      const dbService = getDatabaseService();
      const database = dbService.getDatabase();
      
      if (!database) {
        console.error('❌ Database not initialized - attempting to initialize...');
        
        // Try to initialize the database
        try {
          dbService.initialize();
          const retryDb = dbService.getDatabase();
          
          if (!retryDb) {
            throw new Error('Failed to initialize database');
          }
          
          console.log('✅ Database initialized successfully');
        } catch (initError: any) {
          console.error('❌ Failed to initialize database:', initError);
          throw new Error('Database not initialized. Please restart the application.');
        }
      }
    } catch (error: any) {
      console.error('❌ Database check failed:', error);
      throw new Error('Database not initialized. Please restart the application.');
    }

    let api = getApiService();
    
    // Check internet connectivity first
    console.log('🌐 Checking internet connectivity...');
    const isOnline = await this.checkInternetConnection();
    
    if (!isOnline) {
      console.error('❌ No internet connection available');
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    console.log('✅ Internet connection available');
    
    // Check if in offline mode and try to reconnect
    if (api.isOfflineMode()) {
      console.log('📴 In offline mode - attempting to reconnect...');
      const reconnected = await api.checkAndReconnect();
      
      if (!reconnected) {
        throw new Error('Cannot sync in offline mode. Please login again.');
      }
      
      console.log('✅ Reconnected! Proceeding with sync...');
    }

    this.isRunning = true;
    this.notifyStatus();

    const result: SyncResult = {
      success: true,
      pushed: 0,
      pulled: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    const db = getDatabaseService().getDatabase();
    api = getApiService();

    // Start sync history record
    const syncHistoryStmt = db.prepare(`
      INSERT INTO sync_history (started_at, status)
      VALUES (?, 'running')
    `);
    const syncInfo = syncHistoryStmt.run(result.timestamp);
    const syncHistoryId = syncInfo.lastInsertRowid;

    try {
      // Step 1: Pull remote updates (categories, customers, payment methods, products)
      // These don't require authentication for public POS data
      this.updateProgress('Pulling remote updates...', 20);
      const pulled = await this.pullRemoteUpdates(dryRun);
      result.pulled = pulled;

      // Step 2: Push local changes (orders) - only if authenticated
      let pushed = 0;
      if (api.isAuthenticated()) {
        this.updateProgress('Pushing local changes...', 70);
        pushed = await this.pushLocalChanges(dryRun);
        result.pushed = pushed;
      } else {
        console.log('Skipping push - not authenticated. Only pulling public data.');
      }

      // Update sync history
      db.prepare(`
        UPDATE sync_history
        SET completed_at = ?, status = 'success', items_pushed = ?, items_pulled = ?
        WHERE id = ?
      `).run(new Date().toISOString(), pushed, pulled, syncHistoryId);

      // Update last sync timestamp
      db.prepare(`
        INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync_at', ?)
      `).run(result.timestamp);

      this.updateProgress('Sync completed', 100);

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);

      // Update sync history with error
      db.prepare(`
        UPDATE sync_history
        SET completed_at = ?, status = 'failed', error_message = ?
        WHERE id = ?
      `).run(new Date().toISOString(), error.message, syncHistoryId);

      console.error('Sync error:', error);
    } finally {
      this.isRunning = false;
      this.notifyStatus();
    }

    return result;
  }

  private async pushLocalChanges(dryRun: boolean): Promise<number> {
    const db = getDatabaseService().getDatabase();
    const api = getApiService();

    const queueItems = db.prepare(`
      SELECT * FROM sync_queue
      WHERE synced_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `).all() as any[];

    let pushed = 0;

    for (const item of queueItems) {
      try {
        if (!dryRun) {
          if (item.entity_type === 'order') {
            // Get order from database
            const order = db.prepare(`
              SELECT * FROM orders WHERE local_id = ?
            `).get(item.entity_local_id) as any;

            if (!order) {
              console.error('Order not found:', item.entity_local_id);
              continue;
            }

            // Get order items
            const orderItems = db.prepare(`
              SELECT * FROM order_items WHERE order_local_id = ?
            `).all(item.entity_local_id) as any[];

            // Calculate totals from order items if not present in order
            const calculatedSubTotal = orderItems.reduce((sum: number, item: any) => 
              sum + parseFloat(item.total || 0), 0
            );
            const calculatedTotalQuantity = orderItems.reduce((sum: number, item: any) => 
              sum + parseInt(item.quantity || 0), 0
            );
            
            const subTotal = order.sub_total ? parseFloat(order.sub_total) : calculatedSubTotal;
            const vatAmount = order.vat_amount ? parseFloat(order.vat_amount) : 0;
            const discountAmount = order.discount_amount ? parseFloat(order.discount_amount) : 0;
            const totalAmount = order.total_amount ? parseFloat(order.total_amount) : (subTotal + vatAmount - discountAmount);
            const paidAmount = order.paid_amount ? parseFloat(order.paid_amount) : totalAmount;

            // Get payment method name from ID if it's a number
            let paymentMethodName = order.payment_method || 'cash';
            if (!isNaN(Number(order.payment_method))) {
              const paymentMethodId = Number(order.payment_method);
              const paymentMethod = db.prepare(`
                SELECT name FROM payment_methods WHERE id = ?
              `).get(paymentMethodId) as { name: string } | undefined;
              paymentMethodName = paymentMethod?.name || 'Cash';
            }

            // Format payload for API
            const apiPayload = {
              products: orderItems.map((item: any) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                product_variant_id: item.product_variant_id || null,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price || 0),
                total: parseFloat(item.total || 0),
              })),
              customer_id: order.customer_id || 1,
              store_id: order.store_id || 1,
              sub_total: subTotal,
              vat_amount: vatAmount,
              vat: order.vat || '0',
              discount_amount: discountAmount,
              discount_type: order.discount_type || 'flat',
              total_quantity: order.total_quantity ? parseInt(order.total_quantity) : calculatedTotalQuantity,
              total_amount: totalAmount,
              payment_method: paymentMethodName,
              paid_amount: paidAmount,
              change_amount: parseFloat(order.change_amount || 0),
              shipping_address: order.shipping_address || '',
              note: order.note || '',
              billed_by: (() => {
                const id = order.billed_by;
                if (!id) return null;
                const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
                return emp ? id : null;
              })(),
              salesman_id: (() => {
                const id = order.salesman_id || order.billed_by;
                if (!id) return null;
                const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
                return emp ? id : null;
              })(),
              order_type: order.order_type || 'pos',
              transaction_id: order.transaction_id || null,
            };

            console.log('📤 Uploading order:', order.local_id);
            console.log('📦 Order payload:', JSON.stringify(apiPayload, null, 2));
            
            // Upload order to remote server
            const response = await api.uploadOrder(apiPayload);

            if (response.success) {
              // Update local order with remote_id
              db.prepare(`
                UPDATE orders
                SET remote_id = ?, synced_at = ?
                WHERE local_id = ?
              `).run(response.remote_id, new Date().toISOString(), order.local_id);

              // Mark sync queue item as synced
              db.prepare(`
                UPDATE sync_queue
                SET synced_at = ?
                WHERE id = ?
              `).run(new Date().toISOString(), item.id);

              pushed++;
              console.log('✅ Order synced successfully:', order.local_id);
            }
          }
        } else {
          console.log('Dry run: Would push', item.entity_type, item.entity_local_id);
          pushed++;
        }
      } catch (error: any) {
        console.error('❌ Error pushing item:', error.message);
        
        // Update attempt count and error message
        db.prepare(`
          UPDATE sync_queue
          SET attempts = attempts + 1, last_attempt_at = ?, error_message = ?
          WHERE id = ?
        `).run(new Date().toISOString(), error.message, item.id);
      }
    }

    return pushed;
  }

  private async pullRemoteUpdates(dryRun: boolean): Promise<number> {
    const db = getDatabaseService().getDatabase();
    const api = getApiService();

    let pulled = 0;

    try {
      // Check if we have a valid token
      if (!api.isAuthenticated()) {
        console.warn('⚠️ No valid authentication token. Please login with real credentials to sync.');
        throw new Error('Authentication required. Please login to sync data from server.');
      }

      console.log('🔐 Token found, proceeding with sync...');

      console.log('🔄 Starting data sync from server...');

      // Sync stores
      try {
        console.log('🔄 Syncing stores...');
        const stores = await api.fetchStores();
        if (!dryRun && stores.length > 0) {
          this.syncStores(stores);
        }
      } catch (error: any) {
        console.error('❌ Failed to sync stores:', error.message);
        if (this.isNetworkError(error)) {
          throw new Error('Lost internet connection while syncing stores');
        }
      }

      // Sync categories
      try {
        const categories = await api.fetchCategories();
        if (!dryRun && categories.length > 0) {
          this.syncCategories(categories);
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.error('🚫 401 Unauthorized during category sync - token expired');
          throw new Error('Session expired. Please login again.');
        }
        console.error('Failed to sync categories:', error.message);
      }

      // Sync customers
      try {
        console.log('🔄 Syncing customers...');
        const customers = await api.fetchCustomers();
        if (!dryRun && customers.length > 0) {
          this.syncCustomers(customers);
        }
      } catch (error: any) {
        console.error('❌ Failed to sync customers:', error.message);
        if (this.isNetworkError(error)) {
          throw new Error('Lost internet connection while syncing customers');
        }
      }

      // Sync employees
      try {
        console.log('🔄 Syncing employees...');
        const employees = await api.fetchEmployees();
        console.log(`📊 Received ${employees.length} employees from API`);
        if (!dryRun && employees.length > 0) {
          this.syncEmployees(employees);
        } else if (employees.length === 0) {
          console.log('⚠️ No employees returned from API');
        }
      } catch (error: any) {
        console.error('❌ Failed to sync employees:', error.message);
        if (this.isNetworkError(error)) {
          throw new Error('Lost internet connection while syncing employees');
        }
      }

      // Sync payment methods
      try {
        console.log('🔄 Syncing payment methods...');
        const paymentMethods = await api.fetchPaymentMethods();
        if (!dryRun && paymentMethods.length > 0) {
          this.syncPaymentMethods(paymentMethods);
        }
      } catch (error: any) {
        console.error('❌ Failed to sync payment methods:', error.message);
        if (this.isNetworkError(error)) {
          throw new Error('Lost internet connection while syncing payment methods');
        }
      }

      // Sync site settings
      try {
        console.log('🔄 Syncing site settings...');
        const siteSettings = await api.fetchSiteSettings();
        if (!dryRun && siteSettings) {
          this.syncSiteSettings(siteSettings);
        }
      } catch (error: any) {
        console.error('❌ Failed to sync site settings:', error.message);
        if (this.isNetworkError(error)) {
          throw new Error('Lost internet connection while syncing site settings');
        }
      }

      // Get store_id from app_settings
      const settingsRow = db.prepare(`
        SELECT store_id FROM app_settings WHERE id = 1
      `).get() as { store_id: number } | undefined;
      
      const storeId = settingsRow?.store_id || parseInt(process.env.VITE_DEFAULT_STORE_ID || '2');
      console.log(`🏪 Using store_id: ${storeId} for product sync`);
      console.log(`📊 Settings row:`, settingsRow);

      // Get last sync timestamp
      const lastSyncRow = db.prepare(`
        SELECT value FROM meta WHERE key = 'last_sync_at'
      `).get() as { value: string } | undefined;

      const lastSync = lastSyncRow?.value;

      if (lastSync) {
        // Fetch incremental updates
        const updates = await api.fetchProductUpdates(lastSync, storeId);
        
        if (!dryRun && updates.length > 0) {
          this.updateProducts(updates);
          pulled = updates.length;
        }
        // First time sync - fetch all products
        const products = await api.fetchAllProducts(storeId);
        
        if (!dryRun && products.length > 0) {
          this.seedProducts(products, storeId);
          pulled = products.length;
        }
      }

      // Sync expenses
      try {
        console.log('🔄 Syncing expenses...');
        const expenseRes = await api.fetchExpenses();
        const expenses = expenseRes?.data || [];
        if (!dryRun && expenses.length > 0) {
          this.syncExpenses(expenses);
        }
      } catch (error: any) {
        console.warn('⚠️ Could not sync expenses:', error.message);
      }

      // Sync purchases
      try {
        console.log('🔄 Syncing purchases...');
        const purchaseRes = await api.fetchPurchases();
        const purchases = purchaseRes?.data || [];
        if (!dryRun && purchases.length > 0) {
          this.syncPurchases(purchases);
        }
      } catch (error: any) {
        console.warn('⚠️ Could not sync purchases:', error.message);
      }

      // Sync recent sales
      try {
        console.log('🔄 Syncing recent sales from server...');
        const salesRes = await api.fetchRecentSales(storeId);
        const sales = salesRes?.data || [];
        if (!dryRun && sales.length > 0) {
          this.syncRecentSales(sales);
        }
      } catch (error: any) {
        console.warn('⚠️ Could not sync recent sales:', error.message);
      }

      console.log('✅ Sync completed successfully');
    } catch (error: any) {
      console.error('Error pulling remote updates:', error.message);
      throw error;
    }

    return pulled;
  }

  private syncStores(stores: any[]): void {
    const db = getDatabaseService().getDatabase();

    const insertStore = db.prepare(`
      INSERT OR REPLACE INTO stores (id, remote_id, name, location, address, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((strs: any[]) => {
      for (const store of strs) {
        insertStore.run(
          store.id,
          store.id,
          store.name,
          store.location || '',
          store.location || '',
          store.is_default ? 1 : 0
        );
      }
    });

    insertMany(stores);
    console.log(`✅ Synced ${stores.length} stores`);
  }

  private syncCategories(categories: any[]): void {
    const db = getDatabaseService().getDatabase();

    console.log(`🔄 [SYNC] Syncing ${categories.length} categories to database`);

    const insertCategory = db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, description, remote_id)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((cats: any[]) => {
      for (const cat of cats) {
        insertCategory.run(
          cat.id,
          cat.name,
          cat.slug || '',
          cat.id
        );
      }
    });

    insertMany(categories);
    
    // Verify what was saved
    const savedCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    console.log(`✅ [SYNC] Synced ${categories.length} categories. Total in database: ${savedCount.count}`);
    
    // Show sample of saved categories
    const sampleCategories = db.prepare('SELECT id, name FROM categories ORDER BY name ASC LIMIT 5').all() as any[];
    console.log(`📋 [SYNC] Sample categories in DB:`, sampleCategories.map(c => `${c.name} (ID: ${c.id})`).join(', '));
  }

  private syncCustomers(customers: any[]): void {
    const db = getDatabaseService().getDatabase();

    console.log(`🔄 Syncing ${customers.length} customers - ALWAYS using API data as source of truth`);

    const checkExisting = db.prepare(`
      SELECT id, name, email, phone, address FROM customers WHERE id = ?
    `);
    
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, email, phone, address, remote_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateCustomer = db.prepare(`
      UPDATE customers 
      SET name = ?, email = ?, phone = ?, address = ?, remote_id = ?, updated_at = ?
      WHERE id = ?
    `);

    const syncMany = db.transaction((custs: any[]) => {
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

      for (const cust of custs) {
        const existing = checkExisting.get(cust.id) as any;
        
        // Normalize values for comparison
        const apiName = cust.name || '';
        const apiEmail = cust.email || '';
        const apiPhone = cust.phone || '';
        const apiAddress = cust.address || '';
        
        if (existing) {
          // Check if ANY field has changed - ALWAYS update if different
          const hasChanges = 
            existing.name !== apiName ||
            (existing.email || '') !== apiEmail ||
            (existing.phone || '') !== apiPhone ||
            (existing.address || '') !== apiAddress;
          
          if (hasChanges) {
            // Log what changed
            const changes = [];
            if (existing.name !== apiName) changes.push(`name: "${existing.name}" → "${apiName}"`);
            if ((existing.email || '') !== apiEmail) changes.push(`email: "${existing.email || ''}" → "${apiEmail}"`);
            if ((existing.phone || '') !== apiPhone) changes.push(`phone: "${existing.phone || ''}" → "${apiPhone}"`);
            if ((existing.address || '') !== apiAddress) changes.push(`address: "${existing.address || ''}" → "${apiAddress}"`);
            
            updateCustomer.run(
              apiName,
              apiEmail || null,
              apiPhone || null,
              apiAddress || null,
              cust.id,
              new Date().toISOString(),
              cust.id
            );
            updated++;
            console.log(`✏️ Updated customer ID ${cust.id}: ${changes.join(', ')}`);
          } else {
            unchanged++;
          }
        } else {
          insertCustomer.run(
            cust.id,
            apiName,
            apiEmail || null,
            apiPhone || null,
            apiAddress || null,
            cust.id,
            cust.created_at || new Date().toISOString(),
            cust.updated_at || new Date().toISOString()
          );
          inserted++;
          console.log(`➕ Inserted customer: ${apiName} (ID: ${cust.id})`);
        }
      }
      
      console.log(`📊 Customers sync complete: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`);
    });

    syncMany(customers);
  }

  private syncEmployees(employees: any[]): void {
    const db = getDatabaseService().getDatabase();

    console.log(`🔄 Syncing ${employees.length} employees - ALWAYS using API data as source of truth`);

    const checkExisting = db.prepare(`
      SELECT id, name, email, phone, role, status, address FROM employees WHERE id = ?
    `);
    
    const insertEmployee = db.prepare(`
      INSERT INTO employees (
        id, remote_id, name, email, phone, role, status, join_date, address,
        basic_salary, allowance, salary_effective_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateEmployee = db.prepare(`
      UPDATE employees 
      SET name = ?, email = ?, phone = ?, role = ?, status = ?, join_date = ?, 
          address = ?, basic_salary = ?, allowance = ?, salary_effective_date = ?, 
          updated_at = ?, remote_id = ?
      WHERE id = ?
    `);

    const syncMany = db.transaction((emps: any[]) => {
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

      for (const emp of emps) {
        const existing = checkExisting.get(emp.id) as any;
        
        // Normalize values for comparison
        const apiName = emp.name || '';
        const apiEmail = emp.email || '';
        const apiPhone = emp.phone || '';
        const apiRole = emp.role || '';
        const apiStatus = emp.status || 'active';
        const apiAddress = emp.address || '';
        
        if (existing) {
          // Check if ANY field has changed - ALWAYS update if different
          const hasChanges = 
            existing.name !== apiName ||
            (existing.email || '') !== apiEmail ||
            (existing.phone || '') !== apiPhone ||
            (existing.role || '') !== apiRole ||
            (existing.status || 'active') !== apiStatus ||
            (existing.address || '') !== apiAddress;
          
          if (hasChanges) {
            // Log what changed
            const changes = [];
            if (existing.name !== apiName) changes.push(`name: "${existing.name}" → "${apiName}"`);
            if ((existing.email || '') !== apiEmail) changes.push(`email: "${existing.email || ''}" → "${apiEmail}"`);
            if ((existing.phone || '') !== apiPhone) changes.push(`phone: "${existing.phone || ''}" → "${apiPhone}"`);
            if ((existing.role || '') !== apiRole) changes.push(`role: "${existing.role || ''}" → "${apiRole}"`);
            if ((existing.status || 'active') !== apiStatus) changes.push(`status: "${existing.status || 'active'}" → "${apiStatus}"`);
            if ((existing.address || '') !== apiAddress) changes.push(`address changed`);
            
            updateEmployee.run(
              apiName,
              apiEmail || null,
              apiPhone || null,
              apiRole || null,
              apiStatus,
              emp.join_date || null,
              apiAddress || null,
              emp.current_salary?.basic_salary || 0,
              emp.current_salary?.allowance || 0,
              emp.current_salary?.effective_date || null,
              emp.updated_at || new Date().toISOString(),
              emp.id,
              emp.id
            );
            updated++;
            console.log(`✏️ Updated employee ID ${emp.id}: ${changes.join(', ')}`);
          } else {
            unchanged++;
          }
        } else {
          insertEmployee.run(
            emp.id,
            emp.id,
            apiName,
            apiEmail || null,
            apiPhone || null,
            apiRole || null,
            apiStatus,
            emp.join_date || null,
            apiAddress || null,
            emp.current_salary?.basic_salary || 0,
            emp.current_salary?.allowance || 0,
            emp.current_salary?.effective_date || null,
            emp.created_at || new Date().toISOString(),
            emp.updated_at || new Date().toISOString()
          );
          inserted++;
          console.log(`➕ Inserted employee: ${apiName} (ID: ${emp.id})`);
        }
      }
      
      console.log(`📊 Employees sync complete: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`);
    });

    syncMany(employees);
    
    // Verify the data
    const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
    console.log(`📊 Total employees in database after sync: ${count.count}`);
  }

  private syncPaymentMethods(methods: any[]): void {
    const db = getDatabaseService().getDatabase();

    // Create payment_methods table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        remote_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const insertMethod = db.prepare(`
      INSERT OR REPLACE INTO payment_methods (id, name, slug, sort_order, remote_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((pmts: any[]) => {
      for (const pmt of pmts) {
        insertMethod.run(
          pmt.id,
          pmt.name,
          pmt.slug,
          pmt.sort_order || 0,
          pmt.id
        );
      }
    });

    insertMany(methods);
    console.log(`Synced ${methods.length} payment methods`);
  }

  private syncSiteSettings(settings: any): void {
    const db = getDatabaseService().getDatabase();

    console.log('📝 Syncing site settings from API:');
    console.log('   Title:', settings.title);
    console.log('   Company Name:', settings.company_name);
    console.log('   Invoice Logo:', settings.invoice_logo);
    console.log('   Header Logo:', settings.header_logo);
    console.log('   Footer Logo:', settings.footer_logo);
    console.log('   Signature:', settings.signature);
    console.log('   Address:', settings.address);
    console.log('   VAT Number:', settings.vat_number);
    console.log('   CR Number:', settings.cr_number);
    console.log('   TIN Number:', settings.tin_no);

    db.prepare(`
      INSERT OR REPLACE INTO site_settings (
        id, title, phone, email, whatsapp_id, website, facebook_url, youtube_url,
        vat, tax, address, company_name, vat_number, cr_number, tin_no,
        currency, currency_icon, invoice_logo, signature, header_logo, footer_logo,
        fev_icon, invoice_footer_note, qr_code_enabled, qr_code_size, qr_code_margin,
        zatca_phase, invoice_show_format, country_code, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      settings.title || 'Karbar Ecommerce',
      settings.phone || '',
      settings.email || '',
      settings.whatsapp_id || '',
      settings.website || '',
      settings.facebook_url || '',
      settings.youtube_url || '',
      settings.vat || settings.tax || '0', // Map tax to vat if vat is missing
      settings.tax || '',
      settings.address || '',
      settings.company_name || settings.title || 'Karbar Ecommerce',
      settings.vat_number || '',
      settings.cr_number || '',
      settings.tin_no || '',
      settings.currency || 'bdt',
      settings.currency_icon || '৳',
      settings.invoice_logo || '',
      settings.signature || '',
      settings.header_logo || '',
      settings.footer_logo || '',
      settings.fev_icon || '',
      settings.invoice_footer_note || '',
      settings.qr_code_enabled === '1' ? 1 : 0,
      parseInt(settings.qr_code_size) || 120,
      parseInt(settings.qr_code_margin) || 1,
      parseInt(settings.temp_zatca_phase) || 1,
      settings.invoice_show_format || 'pos_format',
      settings.country_code || settings.temp_country_code || '',
      new Date().toISOString()
    );

    console.log('✅ Synced site settings successfully');
    
    // Auto-update app_settings with ZATCA info if applicable
    if (settings.country_code === 'SA' || settings.temp_country_code === 'SA') {
      console.log('🇸🇦 Saudi Arabia detected, updating app_settings with ZATCA defaults...');
      db.prepare(`
        UPDATE app_settings 
        SET country = 'Saudi Arabia',
            zatca_phase = ?,
            vat_registration_number = COALESCE(NULLIF(?, ''), vat_registration_number),
            commercial_registration_number = COALESCE(NULLIF(?, ''), commercial_registration_number),
            uae_trn = COALESCE(NULLIF(?, ''), uae_trn),
            kuwait_tax_id = COALESCE(NULLIF(?, ''), kuwait_tax_id),
            qr_code_size = COALESCE(NULLIF(?, ''), qr_code_size),
            qr_code_margin = COALESCE(NULLIF(?, ''), qr_code_margin)
        WHERE id = 1
      `).run(
        parseInt(settings.temp_zatca_phase) || 1,
        settings.vat_number || '',
        settings.cr_number || '',
        settings.uae_trn || '',
        settings.kuwait_tax_id || '',
        parseInt(settings.qr_code_size) || 120,
        parseInt(settings.qr_code_margin) || 1
      );
    }

    // Verify what was saved
    const saved = db.prepare('SELECT * FROM site_settings WHERE id = 1').get() as any;
    console.log('✅ Verified saved settings in database:');
    console.log('   Title:', saved.title);
    console.log('   Company Name:', saved.company_name);
    console.log('   Invoice Logo:', saved.invoice_logo);
    console.log('   Header Logo:', saved.header_logo);
    console.log('   Signature:', saved.signature);
  }

  private seedProducts(products: any[], storeId: number): void {
    const db = getDatabaseService().getDatabase();

    console.log(`📝 Seeding ${products.length} products - ALWAYS using server data as source of truth`);
    console.log(`📦 Sample product data:`, products[0]);

    const insertProduct = db.prepare(`
      INSERT OR REPLACE INTO products (
        product_id, sku_code, barcode, product_name, product_type, brand_id,
        unit_price, sale_price, retailer_price, final_sale_price, 
        variant_id, variant_sku, variant_attributes,
        additional_price, available_stock, preview_image, image_preview_style,
        category_id, store_id, remote_id, vat_percentage, vat_sales_price, vat_price, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((products) => {
      for (const product of products) {
        // CRITICAL: Always use product.store_id from API response
        const finalStoreId = product.store_id ? parseInt(product.store_id) : storeId;
        
        // ALWAYS use server stock - server is the source of truth
        const serverStock = parseInt(product.available_stock) || 0;
        
        insertProduct.run(
          product.product_id,
          product.sku_code,
          product.barcode || product.sku_code,
          product.product_name,
          product.product_type || 'general',
          product.brand_id || null,
          product.unit_price,
          product.sale_price,
          product.retailer_price || 0,
          product.final_sale_price,
          product.variant_id,
          product.variant_sku,
          product.variant_attributes,
          product.additional_price,
          serverStock, // ALWAYS use server stock
          product.preview_image,
          product.image_preview_style || 'default',
          product.category_id,
          finalStoreId,
          product.product_id,
          product.vat_percentage || 0,
          product.vat_sales_price || 0,
          product.vat_price || 0,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });

    insertMany(products);
    console.log(`✅ Seeded ${products.length} products with server stock data`);
    
    // Verify the data was inserted with proper store_id distribution
    const storeDistribution = db.prepare('SELECT store_id, COUNT(*) as count FROM products GROUP BY store_id').all();
    console.log(`📊 Products by store_id:`, storeDistribution);
    
    // Show sample of inserted products for the requested store
    const sampleProducts = db.prepare('SELECT product_id, product_name, store_id, sku_code, available_stock FROM products WHERE store_id = ? LIMIT 3').all(storeId);
    console.log(`📦 Sample inserted products for store ${storeId}:`, sampleProducts);

    // Enforce variant barcode rules
    getDatabaseService().enforceBarcodeRules();
  }

  private updateProducts(products: any[]): void {
    const db = getDatabaseService().getDatabase();

    console.log(`🔄 Updating ${products.length} products - ALWAYS using server data as source of truth`);

    // Get store_id from settings as fallback
    const settingsRow = db.prepare(`
      SELECT store_id FROM app_settings WHERE id = 1
    `).get() as { store_id: number } | undefined;
    
    const fallbackStoreId = settingsRow?.store_id || parseInt(process.env.VITE_DEFAULT_STORE_ID || '2');

    const checkExisting = db.prepare(`
      SELECT sku_code, product_name, available_stock, unit_price, sale_price FROM products WHERE sku_code = ?
    `);

    const insertProduct = db.prepare(`
      INSERT INTO products (
        product_id, sku_code, barcode, product_name, product_type, brand_id,
        unit_price, sale_price, retailer_price, final_sale_price, 
        variant_id, variant_sku, variant_attributes,
        additional_price, available_stock, preview_image, image_preview_style,
        category_id, store_id, remote_id, vat_percentage, vat_sales_price, vat_price, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProduct = db.prepare(`
      UPDATE products
      SET product_name = ?, unit_price = ?, sale_price = ?, retailer_price = ?, final_sale_price = ?,
          available_stock = ?, preview_image = ?, image_preview_style = ?,
          category_id = ?, store_id = ?, barcode = ?, product_type = ?, brand_id = ?,
          variant_id = ?, variant_sku = ?, variant_attributes = ?, additional_price = ?,
          vat_percentage = ?, vat_sales_price = ?, vat_price = ?,
          updated_at = ?, synced_at = ?
      WHERE sku_code = ?
    `);

    const updateMany = db.transaction((products) => {
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

      for (const product of products) {
        const finalStoreId = product.store_id ? parseInt(product.store_id) : fallbackStoreId;
        const serverStock = parseInt(product.available_stock) || 0;
        
        const existing = checkExisting.get(product.sku_code) as any;
        
        if (existing) {
          // Check if ANY field has changed - API is ALWAYS source of truth
          const hasChanges = 
            existing.product_name !== product.product_name ||
            parseFloat(existing.unit_price) !== parseFloat(product.unit_price) ||
            parseFloat(existing.sale_price) !== parseFloat(product.sale_price) ||
            parseInt(existing.available_stock) !== serverStock;
          
          if (hasChanges) {
            // ALWAYS UPDATE with API data - API is the priority/source of truth
            updateProduct.run(
              product.product_name,
              product.unit_price,
              product.sale_price,
              product.retailer_price || 0,
              product.final_sale_price,
              serverStock, // ALWAYS use API stock - API is priority
              product.preview_image,
              product.image_preview_style || 'default',
              product.category_id,
              finalStoreId,
              product.barcode || product.sku_code,
              product.product_type || 'general',
              product.brand_id || null,
              product.variant_id,
              product.variant_sku,
              product.variant_attributes,
              product.additional_price,
              product.vat_percentage || 0,
              product.vat_sales_price || 0,
              product.vat_price || 0,
              new Date().toISOString(),
              new Date().toISOString(),
              product.sku_code
            );
            updated++;
            
            if (parseInt(existing.available_stock) !== serverStock) {
              console.log(`📦 ${product.product_name} (${product.sku_code}): Stock ${existing.available_stock} → ${serverStock} (API priority)`);
            }
          } else {
            unchanged++;
          }
        } else {
          // Product doesn't exist, insert it
          insertProduct.run(
            product.product_id,
            product.sku_code,
            product.barcode || product.sku_code,
            product.product_name,
            product.product_type || 'general',
            product.brand_id || null,
            product.unit_price,
            product.sale_price,
            product.retailer_price || 0,
            product.final_sale_price,
            product.variant_id,
            product.variant_sku,
            product.variant_attributes,
            product.additional_price,
            serverStock,
            product.preview_image,
            product.image_preview_style || 'default',
            product.category_id,
            finalStoreId,
            product.product_id,
            product.vat_percentage || 0,
            product.vat_sales_price || 0,
            product.vat_price || 0,
            new Date().toISOString(),
            new Date().toISOString()
          );
          inserted++;
          console.log(`➕ Inserted: ${product.product_name} (${product.sku_code}) - Stock: ${serverStock}`);
        }
      }
      
      console.log(`📊 Products sync complete: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`);
    });

    updateMany(products);
    
    // Show store distribution after update
    const storeDistribution = db.prepare('SELECT store_id, COUNT(*) as count FROM products GROUP BY store_id').all();
    console.log(`📊 Products by store_id after update:`, storeDistribution);

    // Enforce variant barcode rules
    getDatabaseService().enforceBarcodeRules();
  }

  public getStatus(): SyncStatus {
    const db = getDatabaseService().getDatabase();

    const lastSyncRow = db.prepare(`
      SELECT value FROM meta WHERE key = 'last_sync_at'
    `).get() as { value: string } | undefined;

    const queueCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL
    `).get() as { count: number };

    return {
      isRunning: this.isRunning,
      lastSyncAt: lastSyncRow?.value || null,
      queueCount: queueCountRow.count,
      progress: 0,
    };
  }

  public async getSyncHistory(limit: number = 20): Promise<any[]> {
    const db = getDatabaseService().getDatabase();

    return db.prepare(`
      SELECT * FROM sync_history
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit) as any[];
  }

  public startAutoSync(intervalMinutes: number): void {
    console.log(`🔄 [AUTO-SYNC] Starting auto-sync with ${intervalMinutes} minute interval`);
    
    // Stop any existing auto-sync
    this.stopAutoSync();

    // Set up the interval
    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`🔄 [AUTO-SYNC] Interval set to ${intervalMs}ms (${intervalMinutes} minutes)`);
    
    this.autoSyncInterval = setInterval(() => {
      console.log(`🔄 [AUTO-SYNC] Auto-sync triggered at ${new Date().toLocaleTimeString()}`);
      this.startSync()
        .then(() => {
          console.log(`✅ [AUTO-SYNC] Auto-sync completed successfully at ${new Date().toLocaleTimeString()}`);
        })
        .catch((error) => {
          console.error(`❌ [AUTO-SYNC] Auto-sync failed at ${new Date().toLocaleTimeString()}:`, error);
        });
    }, intervalMs);

    console.log(`✅ [AUTO-SYNC] Auto-sync started successfully. Next sync in ${intervalMinutes} minutes`);
    console.log(`✅ [AUTO-SYNC] Auto-sync will run at: ${new Date(Date.now() + intervalMs).toLocaleTimeString()}`);
  }

  public stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('🛑 [AUTO-SYNC] Auto-sync stopped');
    } else {
      console.log('ℹ️ [AUTO-SYNC] No active auto-sync to stop');
    }
  }

  private syncExpenses(expenses: any[]): void {
    const db = getDatabaseService().getDatabase();
    console.log(`🔄 [SYNC] Syncing ${expenses.length} expenses to database`);

    const upsertStmt = db.prepare(`
      INSERT INTO expenses (
        remote_id, type, category, amount, expense_date, description,
        expense_by, expense_by_name, store_id, is_petty_cash, is_synced,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 1,
        ?, ?
      )
      ON CONFLICT(remote_id) DO UPDATE SET
        type = excluded.type,
        category = excluded.category,
        amount = excluded.amount,
        expense_date = excluded.expense_date,
        description = excluded.description,
        expense_by = excluded.expense_by,
        expense_by_name = excluded.expense_by_name,
        store_id = excluded.store_id,
        is_petty_cash = excluded.is_petty_cash,
        is_synced = 1,
        updated_at = excluded.updated_at
    `);

    const runMany = db.transaction((list: any[]) => {
      for (const item of list) {
        const remoteId = item.id || item.remote_id;
        if (!remoteId) continue;
        const type = item.type || item.expense_account || item.category || 'General';
        const category = item.category || item.expense_account || type;
        const amount = parseFloat(item.amount) || 0;
        const expenseDate = item.expense_date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
        const description = item.description || '';
        const expenseBy = item.expense_by || null;
        const expenseByName = item.expense_by_name || item.user?.name || null;
        const storeId = item.store_id || 1;
        const isPettyCash = item.is_petty_cash ? 1 : 0;
        const createdAt = item.created_at || new Date().toISOString();
        const updatedAt = item.updated_at || new Date().toISOString();

        upsertStmt.run(
          remoteId, type, category, amount, expenseDate, description,
          expenseBy, expenseByName, storeId, isPettyCash,
          createdAt, updatedAt
        );
      }
    });

    runMany(expenses);
    console.log(`✅ Synced ${expenses.length} expenses`);
  }

  private syncPurchases(purchases: any[]): void {
    const db = getDatabaseService().getDatabase();
    console.log(`🔄 [SYNC] Syncing ${purchases.length} purchases to database`);

    const upsertStmt = db.prepare(`
      INSERT INTO purchases (
        remote_id, challan_no, supplier_name, status, purchase_type,
        total_quantity, total_amount, store_id, purchase_date,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(remote_id) DO UPDATE SET
        challan_no = excluded.challan_no,
        supplier_name = excluded.supplier_name,
        status = excluded.status,
        purchase_type = excluded.purchase_type,
        total_quantity = excluded.total_quantity,
        total_amount = excluded.total_amount,
        store_id = excluded.store_id,
        purchase_date = excluded.purchase_date,
        updated_at = excluded.updated_at
    `);

    const runMany = db.transaction((list: any[]) => {
      for (const item of list) {
        const remoteId = item.id || item.remote_id;
        if (!remoteId) continue;
        const challanNo = item.challan_no || `PO-${remoteId}`;
        const supplierName = item.supplier_name || (item.supplier ? item.supplier.name : 'General Supplier');
        const status = item.status || 'Received';
        const purchaseType = item.purchase_type || 'Local';
        const totalQuantity = parseInt(item.total_quantity) || 0;
        const totalAmount = parseFloat(item.total_amount) || 0;
        const storeId = item.store_id || 1;
        const purchaseDate = item.purchase_date || item.created_at || new Date().toISOString();
        const createdAt = item.created_at || new Date().toISOString();
        const updatedAt = item.updated_at || new Date().toISOString();

        upsertStmt.run(
          remoteId, challanNo, supplierName, status, purchaseType,
          totalQuantity, totalAmount, storeId, purchaseDate,
          createdAt, updatedAt
        );
      }
    });

    runMany(purchases);
    console.log(`✅ Synced ${purchases.length} purchases`);
  }

  private syncRecentSales(sales: any[]): void {
    const db = getDatabaseService().getDatabase();
    console.log(`🔄 [SYNC] Syncing ${sales.length} recent sales to database`);

    const checkOrderStmt = db.prepare('SELECT id FROM orders WHERE remote_id = ?');
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        local_id, remote_id, customer_id, customer_name, store_id,
        sub_total, discount_amount, discount_type, vat, vat_amount,
        total_quantity, total_amount, payment_method, paid_amount,
        change_amount, payment_status, status, order_type,
        shipping_address, note, billed_by, salesman_id, transaction_id,
        created_at, updated_at, synced_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const insertOrderItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, order_local_id, product_id, product_name,
        product_variant_id, sku_code, variant_attributes,
        quantity, price, total, vat_percentage, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const runMany = db.transaction((list: any[]) => {
      for (const item of list) {
        const remoteId = item.id || item.remote_id;
        if (!remoteId) continue;

        const existing = checkOrderStmt.get(remoteId);
        if (existing) continue; // Already in local database

        const localId = item.order_number || item.invoice_number || `REMOTE-${remoteId}`;
        const customerId = item.customer_id || (item.customer ? item.customer.id : 1);
        const customerName = item.customer_name || (item.customer ? item.customer.name : 'Walk in Customer');
        const storeId = item.store_id || 1;
        const subTotal = parseFloat(item.sub_total || item.total_amount || 0);
        const discountAmount = parseFloat(item.discount_amount || 0);
        const discountType = item.discount_type || 'flat';
        const vat = String(item.vat || '0');
        const vatAmount = parseFloat(item.vat_amount || 0);
        const totalQuantity = parseInt(item.total_quantity || 1);
        const totalAmount = parseFloat(item.total_amount || 0);
        const paymentMethod = String(item.payment_method || 'Cash');
        const paidAmount = parseFloat(item.paid_amount || totalAmount);
        const changeAmount = parseFloat(item.change_amount || 0);
        const paymentStatus = item.payment_status || (paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'due'));
        const status = item.status || 'completed';
        const orderType = item.order_type || 'pos';
        const shippingAddress = item.shipping_address || '';
        const note = item.note || '';
        const billedBy = item.billed_by || 1;
        const salesmanId = item.salesman_id || billedBy;
        const transactionId = item.transaction_id || null;
        const createdAt = item.created_at || new Date().toISOString();
        const updatedAt = item.updated_at || new Date().toISOString();
        const syncedAt = new Date().toISOString();

        const orderInfo = insertOrderStmt.run(
          localId, remoteId, customerId, customerName, storeId,
          subTotal, discountAmount, discountType, vat, vatAmount,
          totalQuantity, totalAmount, paymentMethod, paidAmount,
          changeAmount, paymentStatus, status, orderType,
          shippingAddress, note, billedBy, salesmanId, transactionId,
          createdAt, updatedAt, syncedAt
        );

        const orderId = orderInfo.lastInsertRowid;

        if (item.order_items && Array.isArray(item.order_items)) {
          for (const oi of item.order_items) {
            insertOrderItemStmt.run(
              orderId, localId, oi.product_id || 0, oi.product_name || 'Product',
              oi.product_variant_id || null, oi.sku_code || 'SKU', oi.variant_attributes || null,
              oi.quantity || 1, oi.price || 0, oi.total || (oi.quantity * oi.price) || 0,
              oi.vat_percentage || 0, createdAt
            );
          }
        }
      }
    });

    runMany(sales);
    console.log(`✅ Synced ${sales.length} recent sales`);
  }

  private updateProgress(message: string, progress: number): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('sync:progress', { message, progress });
    }
  }

  private notifyStatus(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('sync:status-changed', this.getStatus());
    }
  }

  private async checkInternetConnection(): Promise<boolean> {
    try {
      const api = getApiService();
      
      // Try to ping the API health endpoint
      await api.checkConnection();
      return true;
    } catch (error) {
      console.error('Internet connection check failed:', error);
      return false;
    }
  }

  private isNetworkError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return errorCode === 'econnrefused' ||
           errorCode === 'enotfound' ||
           errorCode === 'etimedout' ||
           errorCode === 'enetunreach' ||
           errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('connection');
  }
}

// Singleton instance
let syncService: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncService) {
    syncService = new SyncService();
  }
  return syncService;
}
