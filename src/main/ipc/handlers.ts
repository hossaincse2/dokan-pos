import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { getDatabaseService } from '../database';
import { getApiService } from '../services/api.service';
import { getSyncService } from '../services/sync.service';
import { v4 as uuidv4 } from 'uuid';

export function setupIpcHandlers(): void {
  // Auth handlers
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_, credentials) => {
    try {
      console.log('[IPC] Login request received');
      const api = getApiService();
      const result = await api.login(credentials);
      console.log('[IPC] Login successful');
      return result;
    } catch (error: any) {
      console.error('[IPC] Login failed:', error.message);
      // Return error in a format the renderer can handle
      throw new Error(error.message || 'Login failed');
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
    const api = getApiService();
    api.logout();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_CHECK, () => {
    const api = getApiService();
    return {
      isAuthenticated: api.isAuthenticated(),
      user: api.getUser(),
    };
  });

  // Database - Products
  ipcMain.handle(IPC_CHANNELS.DB_GET_PRODUCTS, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    const { page = 1, perPage = 20, storeId, categoryId } = params || {};

    console.log('[DB_GET_PRODUCTS] 🔍 Request params:', { page, perPage, storeId, categoryId });

    // Debug: Check total products in database
    const totalInDb = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    console.log('[DB_GET_PRODUCTS] 📊 Total products in database:', totalInDb.count);
    
    // Debug: Check products by store_id
    const byStore = db.prepare('SELECT store_id, COUNT(*) as count FROM products GROUP BY store_id').all();
    console.log('[DB_GET_PRODUCTS] 🏪 Products by store_id:', byStore);

    const offset = (page - 1) * perPage;

    let query = `
      SELECT * FROM products
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (storeId) {
      query += ` AND store_id = ?`;
      queryParams.push(storeId);
      console.log('[DB_GET_PRODUCTS] 🎯 Filtering by store_id:', storeId);
    } else {
      console.log('[DB_GET_PRODUCTS] ⚠️ No store_id filter - returning all products');
    }

    if (categoryId) {
      query += ` AND category_id = ?`;
      queryParams.push(categoryId);
      console.log('[DB_GET_PRODUCTS] 📁 Filtering by category_id:', categoryId);
    }

    query += ` ORDER BY product_name ASC LIMIT ? OFFSET ?`;
    queryParams.push(perPage, offset);

    console.log('[DB_GET_PRODUCTS] 📝 SQL Query:', query);
    console.log('[DB_GET_PRODUCTS] 📝 Query Params:', queryParams);

    const products = db.prepare(query).all(...queryParams) as any[];
    
    console.log('[DB_GET_PRODUCTS] ✅ Found products:', products.length);
    
    if (products.length > 0) {
      console.log('[DB_GET_PRODUCTS] 📦 Sample product:', {
        product_id: products[0].product_id,
        product_name: products[0].product_name,
        store_id: products[0].store_id,
        sku_code: products[0].sku_code
      });
    } else {
      console.log('[DB_GET_PRODUCTS] ⚠️ No products found with current filters');
    }

    // Build count query with same filters
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
    const countParams: any[] = [];
    
    if (storeId) {
      countQuery += ` AND store_id = ?`;
      countParams.push(storeId);
    }
    
    if (categoryId) {
      countQuery += ` AND category_id = ?`;
      countParams.push(categoryId);
    }

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };
    console.log('[DB_GET_PRODUCTS] 📊 Total matching products:', total);

    // Debug: Show category distribution
    if (categoryId) {
      const categoryCheck = db.prepare(`
        SELECT category_id, COUNT(*) as count 
        FROM products 
        WHERE store_id = ? 
        GROUP BY category_id
      `).all(storeId);
      console.log('[DB_GET_PRODUCTS] Category distribution:', categoryCheck);
    }

    return {
      data: products,
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  });

  ipcMain.handle(IPC_CHANNELS.DB_SEARCH_PRODUCTS, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    
    // Support both old (string) and new (object with searchTerm and storeId) formats
    const searchTerm = typeof params === 'string' ? params : params.searchTerm;
    const storeId = typeof params === 'object' ? params.storeId : undefined;

    console.log('[DB_SEARCH_PRODUCTS] 🔍 Searching for:', searchTerm, 'in store:', storeId || 'all stores');

    // Build WHERE clause for store filtering
    const storeFilter = storeId ? ' AND store_id = ?' : '';
    const storeParams = storeId ? [storeId] : [];

    // First try exact match on barcode, SKU, or variant SKU (for barcode scanning)
    const exactMatchQuery = `
      SELECT * FROM products
      WHERE (barcode = ? OR sku_code = ? OR variant_sku = ?)${storeFilter}
    `;
    const exactMatches = db.prepare(exactMatchQuery).all(searchTerm, searchTerm, searchTerm, ...storeParams);

    console.log('[DB_SEARCH_PRODUCTS] Exact match result:', exactMatches.length > 0 ? `FOUND ${exactMatches.length} matches` : 'NOT FOUND');

    if (exactMatches.length > 0) {
      console.log('[DB_SEARCH_PRODUCTS] ✅ Found matching product(s):', exactMatches.map((m: any) => m.product_name).join(', '));
      return exactMatches;
    }

    // If no exact match, do partial search
    const partialSearchQuery = `
      SELECT * FROM products
      WHERE (product_name LIKE ? OR sku_code LIKE ? OR variant_sku LIKE ? OR barcode LIKE ?)${storeFilter}
      ORDER BY product_name ASC
      LIMIT 50
    `;
    const searchPattern = `%${searchTerm}%`;
    const products = db.prepare(partialSearchQuery).all(
      searchPattern, searchPattern, searchPattern, searchPattern, ...storeParams
    );

    console.log('[DB_SEARCH_PRODUCTS] ✅ Partial search found:', products.length, 'products');

    return products;
  });

  ipcMain.handle(IPC_CHANNELS.DB_GET_PRODUCT, async (_, id) => {
    const db = getDatabaseService().getDatabase();

    return db.prepare(`
      SELECT * FROM products WHERE id = ?
    `).get(id);
  });

  // Database - Stores
  ipcMain.handle(IPC_CHANNELS.DB_GET_STORES, () => {
    const db = getDatabaseService().getDatabase();

    try {
      // Remove legacy static dummy placeholder store if present
      db.prepare(`DELETE FROM stores WHERE name = 'Main Store' AND (remote_id IS NULL OR remote_id = 0)`).run();
    } catch (e) {
      console.warn('Could not clean up dummy store:', e);
    }

    return db.prepare(`
      SELECT * FROM stores WHERE name != 'Main Store' OR remote_id IS NOT NULL ORDER BY name ASC
    `).all();
  });

  // Database - Categories
  ipcMain.handle(IPC_CHANNELS.DB_GET_CATEGORIES, () => {
    const db = getDatabaseService().getDatabase();

    return db.prepare(`
      SELECT * FROM categories ORDER BY name ASC
    `).all();
  });

  // Database - Customers
  ipcMain.handle(IPC_CHANNELS.DB_GET_CUSTOMERS, () => {
    const db = getDatabaseService().getDatabase();

    return db.prepare(`
      SELECT * FROM customers ORDER BY name ASC
    `).all();
  });

  // Database - Employees
  ipcMain.handle(IPC_CHANNELS.DB_GET_EMPLOYEES, () => {
    const db = getDatabaseService().getDatabase();

    // First check total count
    const totalCount = db.prepare(`SELECT COUNT(*) as count FROM employees`).get() as { count: number };
    console.log('[DB_GET_EMPLOYEES] Total employees in DB:', totalCount.count);

    // Get all employees (not just active)
    const allEmployees = db.prepare(`SELECT * FROM employees ORDER BY name ASC`).all();
    console.log('[DB_GET_EMPLOYEES] All employees:', allEmployees);

    // Get active employees
    const employees = db.prepare(`
      SELECT * FROM employees WHERE status = 'active' OR status IS NULL ORDER BY name ASC
    `).all();
    
    console.log('[DB_GET_EMPLOYEES] Active employees:', employees.length);
    console.log('[DB_GET_EMPLOYEES] Employees data:', employees);
    
    return employees;
  });

  // Database - Payment Methods
  ipcMain.handle(IPC_CHANNELS.DB_GET_PAYMENT_METHODS, () => {
    const db = getDatabaseService().getDatabase();

    try {
      return db.prepare(`
        SELECT * FROM payment_methods ORDER BY sort_order ASC
      `).all();
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  });

  // Database - Site Settings
  ipcMain.handle(IPC_CHANNELS.DB_GET_SITE_SETTINGS, () => {
    const db = getDatabaseService().getDatabase();

    try {
      return db.prepare(`
        SELECT * FROM site_settings WHERE id = 1
      `).get();
    } catch (error) {
      console.error('Error fetching site settings:', error);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_CUSTOMER, async (_, customer) => {
    const db = getDatabaseService().getDatabase();
    const api = getApiService();

    let remoteId: number | null = null;
    if (api.isAuthenticated() && !api.isOfflineMode()) {
      try {
        const response = await api.createCustomer({
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
        });
        if (response?.id || response?.data?.id) {
          remoteId = response.id || response.data.id;
        }
      } catch (err: any) {
        console.warn('[DB_CREATE_CUSTOMER] Online customer creation failed, saved locally:', err.message);
      }
    }

    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, address, remote_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(customer.name, customer.email || '', customer.phone || '', customer.address || '', remoteId);

    return db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).get(result.lastInsertRowid);
  });

  // Expenses - Get list & summaries
  ipcMain.handle(IPC_CHANNELS.DB_GET_EXPENSES, async (_, params = {}) => {
    const db = getDatabaseService().getDatabase();
    const { startDate, endDate, search, type } = params;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const queryParams: any[] = [];

    if (startDate && endDate) {
      query += ' AND expense_date BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ' AND expense_date >= ?';
      queryParams.push(startDate);
    } else if (endDate) {
      query += ' AND expense_date <= ?';
      queryParams.push(endDate);
    }

    if (type && type !== 'all') {
      query += ' AND type = ?';
      queryParams.push(type);
    }

    if (search && search.trim()) {
      query += ' AND (description LIKE ? OR type LIKE ? OR expense_by_name LIKE ?)';
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term);
    }

    query += ' ORDER BY expense_date DESC, id DESC';

    const expenses = db.prepare(query).all(...queryParams) as any[];

    // Calculate summaries
    const today = new Date().toISOString().split('T')[0];
    const totalRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get() as { total: number };
    const todayRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as today_total FROM expenses WHERE expense_date = ?').get(today) as { today_total: number };

    return {
      data: expenses,
      summary: {
        total_expenses: totalRow?.total || 0,
        total_today_expense: todayRow?.today_total || 0,
      }
    };
  });

  // Expenses - Create
  ipcMain.handle(IPC_CHANNELS.DB_CREATE_EXPENSE, async (_, expenseData) => {
    const db = getDatabaseService().getDatabase();
    const api = getApiService();
    const currentUser = api.getUser();

    const type = expenseData.type || expenseData.expense_account || 'Others';
    const amount = parseFloat(expenseData.amount) || 0;
    const expenseDate = expenseData.expense_date || new Date().toISOString().split('T')[0];
    const description = expenseData.description || '';
    const expenseBy = expenseData.expense_by || currentUser?.id || null;
    const expenseByName = expenseData.expense_by_name || currentUser?.name || 'Staff';
    const isPettyCash = expenseData.is_petty_cash ? 1 : 0;

    // Get current store id
    const settingsRow = db.prepare('SELECT store_id FROM app_settings WHERE id = 1').get() as any;
    const storeId = settingsRow?.store_id || 1;

    let remoteId: number | null = null;
    let isSynced = 0;

    // Try online API sync if available
    if (api.isAuthenticated() && !api.isOfflineMode()) {
      try {
        const response = await api.createExpense({
          expense_account: type,
          amount,
          expense_date: expenseDate,
          description,
          is_petty_cash: isPettyCash === 1,
          store_id: storeId,
        });
        if (response?.data?.id || response?.id) {
          remoteId = response.data?.id || response.id;
          isSynced = 1;
        }
      } catch (err: any) {
        console.warn('[DB_CREATE_EXPENSE] Online sync failed, saving locally:', err.message);
      }
    }

    const insertResult = db.prepare(`
      INSERT INTO expenses (
        remote_id, type, amount, expense_date, description,
        expense_by, expense_by_name, store_id, is_petty_cash, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(remoteId, type, amount, expenseDate, description, expenseBy, expenseByName, storeId, isPettyCash, isSynced);

    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(insertResult.lastInsertRowid);
  });

  // Expenses - Delete
  ipcMain.handle(IPC_CHANNELS.DB_DELETE_EXPENSE, async (_, id: number) => {
    const db = getDatabaseService().getDatabase();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return { success: true };
  });

  // Expenses - Types
  ipcMain.handle(IPC_CHANNELS.DB_GET_EXPENSE_TYPES, async () => {
    const defaultTypes = [
      'Snacks',
      'Rent',
      'Utilities',
      'Marketing',
      'Salaries',
      'Transportation',
      'Others',
    ];

    const api = getApiService();
    if (api.isAuthenticated() && !api.isOfflineMode()) {
      try {
        const res = await api.fetchExpenseTypes();
        if (res?.data?.expense_types && Array.isArray(res.data.expense_types)) {
          return res.data.expense_types;
        }
      } catch (e) {
        // Fallback to static types
      }
    }

    return defaultTypes;
  });

  // Orders - Create
  ipcMain.handle(IPC_CHANNELS.POS_CREATE_ORDER, async (_, orderData) => {
    const db = getDatabaseService().getDatabase();
    const localId = uuidv4();

    const createOrder = db.transaction((data) => {
      // Insert order
      const salesmanId = data.salesman_id || data.billed_by || null;
      const orderResult = db.prepare(`
        INSERT INTO orders (
          local_id, customer_id, customer_name, store_id, sub_total, 
          discount_amount, discount_type, vat, vat_amount, total_quantity,
          total_amount, payment_method, paid_amount, change_amount,
          payment_status, status, order_type, shipping_address, note, billed_by, salesman_id, is_tax_inclusive
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        localId,
        data.customer_id || 1,
        data.customer_name || 'Walk in',
        data.store_id || 1,
        data.sub_total || data.subtotal,
        data.discount_amount || data.discount || 0,
        data.discount_type || 'flat',
        data.vat || '0',
        data.vat_amount || data.tax || 0,
        data.total_quantity,
        data.total_amount || data.total,
        data.payment_method,
        data.paid_amount || data.total_amount || data.total,
        data.change_amount || 0,
        data.payment_status || 'paid',
        data.status || 'completed',
        data.order_type || 'pos',
        data.shipping_address || '',
        data.note || data.notes || '',
        salesmanId,
        salesmanId,
        data.is_tax_inclusive ? 1 : 0
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, order_local_id, product_id, product_name, 
          product_variant_id, sku_code, variant_attributes, 
          quantity, price, total, vat_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        insertItem.run(
          orderId,
          localId,
          item.product_id,
          item.product_name,
          item.product_variant_id || null,
          item.sku_code,
          item.variant_attributes || null,
          item.quantity,
          item.price,
          item.total,
          item.vat_percentage || 0
        );

        // Get current stock before update
        const currentProduct = db.prepare(`
          SELECT product_name, available_stock FROM products WHERE sku_code = ?
        `).get(item.sku_code) as { product_name: string; available_stock: number } | undefined;

        if (currentProduct) {
          const newStock = currentProduct.available_stock - item.quantity;
          console.log(`📦 Stock Update: ${currentProduct.product_name} (${item.sku_code})`);
          console.log(`   Before: ${currentProduct.available_stock} | Sold: ${item.quantity} | After: ${newStock}`);
          
          // Update product stock using sku_code (more reliable than product_id)
          const updateResult = db.prepare(`
            UPDATE products
            SET available_stock = available_stock - ?, updated_at = ?
            WHERE sku_code = ?
          `).run(item.quantity, new Date().toISOString(), item.sku_code);
          
          if (updateResult.changes === 0) {
            console.error(`❌ Failed to update stock for SKU: ${item.sku_code}`);
          } else {
            console.log(`✅ Stock updated successfully`);
          }
        } else {
          console.error(`❌ Product not found for stock update: ${item.sku_code}`);
        }
      }

      // Add to sync queue
      db.prepare(`
        INSERT INTO sync_queue (entity_type, entity_local_id, action, payload)
        VALUES (?, ?, ?, ?)
      `).run('order', localId, 'create', JSON.stringify({
        local_id: localId,
        ...data,
      }));

      return orderId;
    });

    const orderId = createOrder(orderData);

    return db.prepare(`
      SELECT * FROM orders WHERE id = ?
    `).get(orderId);
  });

  // Orders - Get
  ipcMain.handle(IPC_CHANNELS.POS_GET_ORDERS, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    const { page = 1, perPage = 20, status, synced } = params || {};

    const offset = (page - 1) * perPage;

    let query = `SELECT * FROM orders WHERE 1=1`;
    const queryParams: any[] = [];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (synced !== undefined) {
      query += synced ? ` AND synced_at IS NOT NULL` : ` AND synced_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(perPage, offset);

    const orders = db.prepare(query).all(...queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
    const countParams: any[] = [];

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    if (synced !== undefined) {
      countQuery += synced ? ` AND synced_at IS NOT NULL` : ` AND synced_at IS NULL`;
    }

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return {
      data: orders,
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  });

  ipcMain.handle(IPC_CHANNELS.POS_GET_ORDER, async (_, orderId) => {
    const db = getDatabaseService().getDatabase();

    const order = db.prepare(`
      SELECT 
        orders.*,
        stores.name as store_name,
        customers.phone as customer_phone
      FROM orders
      LEFT JOIN stores ON orders.store_id = stores.id
      LEFT JOIN customers ON orders.customer_id = customers.id
      WHERE orders.id = ? OR orders.local_id = ?
    `).get(orderId, orderId);

    if (!order) return null;

    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all((order as any).id);

    return { ...order, items };
  });

  // Expenses handlers
  ipcMain.handle(IPC_CHANNELS.DB_GET_EXPENSES, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    const { startDate, endDate, type, search } = params || {};

    let query = `SELECT * FROM expenses WHERE 1=1`;
    const queryParams: any[] = [];

    if (startDate) {
      query += ` AND substr(expense_date, 1, 10) >= ?`;
      queryParams.push(startDate);
    }
    if (endDate) {
      query += ` AND substr(expense_date, 1, 10) <= ?`;
      queryParams.push(endDate);
    }
    if (type && type !== 'all') {
      query += ` AND (type = ? OR category = ?)`;
      queryParams.push(type, type);
    }
    if (search) {
      query += ` AND (description LIKE ? OR expense_by_name LIKE ? OR type LIKE ?)`;
      const s = `%${search}%`;
      queryParams.push(s, s, s);
    }

    query += ` ORDER BY expense_date DESC, id DESC`;
    const expenses = db.prepare(query).all(...queryParams) as any[];

    // Calculate summaries
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses
      .filter((e: any) => e.expense_date && e.expense_date.startsWith(todayStr))
      .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

    return {
      success: true,
      data: expenses,
      summary: {
        total_expenses: totalExpenses,
        total_today_expense: todayExpenses,
      },
    };
  });

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_EXPENSE, async (_, expenseData) => {
    const db = getDatabaseService().getDatabase();
    const api = getApiService();

    const { type, amount, expense_date, description, is_petty_cash = false, store_id = 1 } = expenseData;

    let remoteId: number | null = null;
    let isSynced = 0;

    // Try to upload to server if online
    if (api.isAuthenticated()) {
      try {
        const response = await api.createExpense({
          expense_account: type,
          amount: parseFloat(amount),
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          description: description || '',
          is_petty_cash: !!is_petty_cash,
          store_id,
        });
        if (response && (response.id || response.data?.id)) {
          remoteId = response.id || response.data?.id;
          isSynced = 1;
        }
      } catch (err: any) {
        console.warn('[IPC] Could not push expense immediately, will sync later:', err.message);
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO expenses (
        remote_id, type, category, amount, expense_date, description,
        expense_by, expense_by_name, store_id, is_petty_cash, is_synced,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const user = api.getUser();
    const info = insertStmt.run(
      remoteId,
      type,
      type,
      parseFloat(amount),
      expense_date || new Date().toISOString().split('T')[0],
      description || '',
      user?.id || null,
      user?.name || 'Super Admin',
      store_id,
      is_petty_cash ? 1 : 0,
      isSynced
    );

    return {
      success: true,
      id: info.lastInsertRowid,
      message: 'Expense created successfully',
    };
  });

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_EXPENSE, async (_, id: number) => {
    const db = getDatabaseService().getDatabase();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.DB_GET_EXPENSE_TYPES, async () => {
    const db = getDatabaseService().getDatabase();
    const rows = db.prepare(`
      SELECT DISTINCT type FROM expenses WHERE type IS NOT NULL AND type != ''
      UNION
      SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL AND category != ''
    `).all() as any[];

    const types = rows.map((r: any) => r.type || r.category).filter(Boolean);
    const defaults = ['Snacks', 'Rent', 'Utilities', 'Marketing', 'Salaries', 'Transportation', 'Office Supplies', 'Others'];
    const merged = Array.from(new Set([...defaults, ...types]));
    return merged;
  });

  // Purchases handler
  ipcMain.handle(IPC_CHANNELS.DB_GET_PURCHASES, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    const { startDate, endDate } = params || {};
    let query = `SELECT * FROM purchases WHERE 1=1`;
    const queryParams: any[] = [];

    if (startDate) {
      query += ` AND substr(purchase_date, 1, 10) >= ?`;
      queryParams.push(startDate);
    }
    if (endDate) {
      query += ` AND substr(purchase_date, 1, 10) <= ?`;
      queryParams.push(endDate);
    }

    query += ` ORDER BY purchase_date DESC, id DESC`;
    const purchases = db.prepare(query).all(...queryParams);
    return purchases;
  });

  // Reports handler - Full local database aggregations
  ipcMain.handle(IPC_CHANNELS.DB_GET_REPORTS, async (_, params) => {
    const db = getDatabaseService().getDatabase();
    const { dateRange = 'today', startDate, endDate, storeId } = params || {};

    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let start = startDate;
    let end = endDate;

    if (dateRange === 'today') {
      start = formatDate(now);
      end = formatDate(now);
    } else if (dateRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = formatDate(y);
      end = formatDate(y);
    } else if (dateRange === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      start = formatDate(w);
      end = formatDate(now);
    } else if (dateRange === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatDate(m);
      end = formatDate(now);
    }

    // 1. Fetch Orders within date range
    let ordersQuery = `
      SELECT 
        orders.*,
        customers.name as customer_name,
        customers.phone as customer_phone
      FROM orders
      LEFT JOIN customers ON orders.customer_id = customers.id
      WHERE 1=1
    `;
    const orderParams: any[] = [];

    if (start) {
      ordersQuery += ` AND substr(orders.created_at, 1, 10) >= ?`;
      orderParams.push(start);
    }
    if (end) {
      ordersQuery += ` AND substr(orders.created_at, 1, 10) <= ?`;
      orderParams.push(end);
    }
    if (storeId) {
      ordersQuery += ` AND orders.store_id = ?`;
      orderParams.push(storeId);
    }

    ordersQuery += ` ORDER BY orders.created_at DESC`;
    const orders = db.prepare(ordersQuery).all(...orderParams) as any[];

    // Fetch items for all these orders
    const orderIds = orders.map((o: any) => o.id);
    let orderItems: any[] = [];
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      orderItems = db.prepare(`
        SELECT order_items.*, products.cost as product_cost, products.unit_price as product_unit_price, products.category_id
        FROM order_items
        LEFT JOIN products ON order_items.product_id = products.product_id
        WHERE order_items.order_id IN (${placeholders})
      `).all(...orderIds) as any[];
    }

    // Attach items to orders
    const itemsByOrderId = new Map<number, any[]>();
    for (const item of orderItems) {
      if (!itemsByOrderId.has(item.order_id)) {
        itemsByOrderId.set(item.order_id, []);
      }
      itemsByOrderId.get(item.order_id)!.push(item);
    }

    for (const order of orders) {
      order.items = itemsByOrderId.get(order.id) || [];
    }

    // Sales Aggregations
    const totalSales = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalDiscount = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.discount_amount) || 0), 0);
    const totalVat = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.vat_amount) || 0), 0);
    const totalPaid = orders.reduce((sum: number, o: any) => sum + Math.min(parseFloat(o.paid_amount) || 0, parseFloat(o.total_amount) || 0), 0);
    const totalDue = orders.reduce((sum: number, o: any) => {
      const total = parseFloat(o.total_amount) || 0;
      const paid = parseFloat(o.paid_amount) || 0;
      return sum + Math.max(0, total - paid);
    }, 0);
    const totalItemsSold = orderItems.reduce((sum: number, i: any) => sum + (parseInt(i.quantity) || 0), 0);

    // 2. Fetch Purchases within date range
    let purchasesQuery = `SELECT * FROM purchases WHERE 1=1`;
    const purchaseParams: any[] = [];

    if (start) {
      purchasesQuery += ` AND (substr(purchase_date, 1, 10) >= ? OR substr(created_at, 1, 10) >= ?)`;
      purchaseParams.push(start, start);
    }
    if (end) {
      purchasesQuery += ` AND (substr(purchase_date, 1, 10) <= ? OR substr(created_at, 1, 10) <= ?)`;
      purchaseParams.push(end, end);
    }
    if (storeId) {
      purchasesQuery += ` AND store_id = ?`;
      purchaseParams.push(storeId);
    }

    purchasesQuery += ` ORDER BY purchase_date DESC`;
    const purchases = db.prepare(purchasesQuery).all(...purchaseParams) as any[];

    const totalPurchase = purchases.reduce((sum: number, p: any) => sum + (parseFloat(p.total_amount) || 0), 0);
    const totalPurchaseQuantity = purchases.reduce((sum: number, p: any) => sum + (parseInt(p.total_quantity) || 0), 0);

    // 3. Fetch Expenses within date range
    let expensesQuery = `SELECT * FROM expenses WHERE 1=1`;
    const expenseParams: any[] = [];

    if (start) {
      expensesQuery += ` AND substr(expense_date, 1, 10) >= ?`;
      expenseParams.push(start);
    }
    if (end) {
      expensesQuery += ` AND substr(expense_date, 1, 10) <= ?`;
      expenseParams.push(end);
    }
    if (storeId) {
      expensesQuery += ` AND store_id = ?`;
      expenseParams.push(storeId);
    }

    expensesQuery += ` ORDER BY expense_date DESC`;
    const expenses = db.prepare(expensesQuery).all(...expenseParams) as any[];

    const totalExpense = expenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

    // Group expenses by category
    const expenseCategoryMap = new Map<string, { category: string; amount: number; count: number }>();
    for (const exp of expenses) {
      const cat = exp.category || exp.type || 'Other';
      const existing = expenseCategoryMap.get(cat) || { category: cat, amount: 0, count: 0 };
      existing.amount += parseFloat(exp.amount) || 0;
      existing.count += 1;
      expenseCategoryMap.set(cat, existing);
    }
    const expensesByCategory = Array.from(expenseCategoryMap.values()).sort((a, b) => b.amount - a.amount);

    // Business Summary Calculations
    const returnedOrders = orders.filter((o: any) => 
      o.status === 'returned' || 
      o.status === 'partially_returned' || 
      o.order_type === 'return' || 
      (parseFloat(o.total_amount) < 0)
    );
    const totalReturns = returnedOrders.reduce((sum: number, o: any) => sum + Math.abs(parseFloat(o.total_amount) || 0), 0);
    const businessNetAmount = totalSales - totalReturns - totalExpense;

    const pettyExpenses = expenses.filter((e: any) => 
      e.is_petty_cash === 1 || 
      (e.category && e.category.toLowerCase().includes('petty')) ||
      (e.type && e.type.toLowerCase().includes('petty'))
    );
    const pettyCashSpent = pettyExpenses.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const pettyCashBalance = Math.max(0, 0 - pettyCashSpent);

    const cashOrders = orders.filter((o: any) => normalizePaymentMethod(o.payment_method) === 'Cash');
    const cashIn = cashOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.paid_amount || o.total_amount) || 0), 0);

    const cashExpenses = expenses.filter((e: any) => 
      !e.payment_method || 
      String(e.payment_method).toLowerCase().includes('cash') || 
      e.payment_method === '1'
    ).reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);

    const cashPurchases = purchases.filter((p: any) => 
      !p.payment_method || 
      String(p.payment_method).toLowerCase().includes('cash') || 
      p.payment_method === '1'
    ).reduce((sum: number, p: any) => sum + (parseFloat(p.total_amount) || 0), 0);

    const cashOut = cashExpenses + cashPurchases;

    let openingBalance = 0;
    if (start && dateRange !== 'all') {
      try {
        const priorSalesRow = db.prepare(`
          SELECT SUM(COALESCE(paid_amount, total_amount, 0)) as total
          FROM orders
          WHERE (payment_method LIKE '%cash%' OR payment_method = '1' OR payment_method = 'Cash')
          AND substr(created_at, 1, 10) < ?
          ${storeId ? 'AND store_id = ?' : ''}
        `).get(...(storeId ? [start, storeId] : [start])) as any;
        const priorSales = parseFloat(priorSalesRow?.total) || 0;

        const priorExpRow = db.prepare(`
          SELECT SUM(COALESCE(amount, 0)) as total
          FROM expenses
          WHERE substr(expense_date, 1, 10) < ?
          ${storeId ? 'AND store_id = ?' : ''}
        `).get(...(storeId ? [start, storeId] : [start])) as any;
        const priorExpenses = parseFloat(priorExpRow?.total) || 0;

        const priorPurRow = db.prepare(`
          SELECT SUM(COALESCE(total_amount, 0)) as total
          FROM purchases
          WHERE (substr(purchase_date, 1, 10) < ? OR substr(created_at, 1, 10) < ?)
          ${storeId ? 'AND store_id = ?' : ''}
        `).get(...(storeId ? [start, start, storeId] : [start, start])) as any;
        const priorPurchases = parseFloat(priorPurRow?.total) || 0;

        openingBalance = Math.max(0, priorSales - priorExpenses - priorPurchases);
      } catch (e) {
        console.error('Error calculating opening balance:', e);
      }
    }
    const closingBalance = Math.max(0, openingBalance + cashIn - cashOut);

    // 4. Profit Calculation (Gross Sales - COGS = Gross Profit; Gross Profit - Expenses = Net Profit)
    let cogs = 0;
    for (const item of orderItems) {
      const costPerUnit = parseFloat(item.product_cost) || parseFloat(item.product_unit_price) || (parseFloat(item.price) * 0.7);
      cogs += (parseInt(item.quantity) || 0) * costPerUnit;
    }
    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit - totalExpense;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // 5. Due Orders & Due Collections
    const dueOrders = orders.filter((o: any) => {
      const tot = parseFloat(o.total_amount) || 0;
      const pd = parseFloat(o.paid_amount) || 0;
      return (tot - pd) > 0.01;
    }).map((o: any) => ({
      ...o,
      due_amount: Math.max(0, (parseFloat(o.total_amount) || 0) - (parseFloat(o.paid_amount) || 0)),
    }));

    const dueCollections = orders.filter((o: any) => {
      const pd = parseFloat(o.paid_amount) || 0;
      return pd > 0;
    }).map((o: any) => ({
      ...o,
      collected_amount: Math.min(parseFloat(o.paid_amount) || 0, parseFloat(o.total_amount) || 0),
    }));

    const totalDueCollection = dueCollections.reduce((sum: number, o: any) => sum + o.collected_amount, 0);

    // 6. Best Selling Products
    const productSoldMap = new Map<number, {
      product_id: number;
      product_name: string;
      sku_code: string;
      category_name?: string;
      quantity_sold: number;
      unit_price: number;
      sale_price: number;
      total_revenue: number;
      estimated_profit: number;
    }>();

    for (const item of orderItems) {
      const pid = item.product_id;
      const existing = productSoldMap.get(pid) || {
        product_id: pid,
        product_name: item.product_name,
        sku_code: item.sku_code,
        quantity_sold: 0,
        unit_price: parseFloat(item.product_cost || item.product_unit_price || 0),
        sale_price: parseFloat(item.price || 0),
        total_revenue: 0,
        estimated_profit: 0,
      };

      const qty = parseInt(item.quantity) || 0;
      const rev = parseFloat(item.total) || (qty * existing.sale_price);
      const cost = qty * (existing.unit_price || existing.sale_price * 0.7);

      existing.quantity_sold += qty;
      existing.total_revenue += rev;
      existing.estimated_profit += (rev - cost);
      productSoldMap.set(pid, existing);
    }

    const bestSellingProducts = Array.from(productSoldMap.values())
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, 30);

    // 7. Low Stock Products (stock <= 10)
    const lowStockRows = db.prepare(`
      SELECT 
        products.id,
        products.product_id,
        products.product_name,
        products.sku_code,
        products.barcode,
        products.available_stock,
        products.unit_price,
        products.sale_price,
        products.final_sale_price,
        categories.name as category_name
      FROM products
      LEFT JOIN categories ON products.category_id = categories.id
      WHERE products.available_stock <= 10
      ORDER BY products.available_stock ASC
      LIMIT 100
    `).all() as any[];

    const lowStockProducts = lowStockRows.map((p: any) => ({
      ...p,
      status: p.available_stock <= 0 ? 'out_of_stock' : (p.available_stock <= 5 ? 'critical' : 'low'),
    }));

    // 8. Payment Method Sales Breakdown (Cash / Card / bKash / Nagad / Other)
    const paymentMethodsList = db.prepare('SELECT id, name, slug FROM payment_methods').all() as any[];
    const paymentMethodNameLookup = new Map<string, string>();
    for (const pm of paymentMethodsList) {
      paymentMethodNameLookup.set(String(pm.id), pm.name);
      if (pm.slug) paymentMethodNameLookup.set(pm.slug.toLowerCase(), pm.name);
      if (pm.name) paymentMethodNameLookup.set(pm.name.toLowerCase(), pm.name);
    }

    const normalizePaymentMethod = (raw: string | number): string => {
      if (!raw) return 'Cash';
      const str = String(raw).trim();
      if (paymentMethodNameLookup.has(str)) {
        return paymentMethodNameLookup.get(str)!;
      }
      const lower = str.toLowerCase();
      if (lower.includes('cash')) return 'Cash';
      if (lower.includes('bkash')) return 'bKash';
      if (lower.includes('nagad')) return 'Nagad';
      if (lower.includes('card') || lower.includes('visa') || lower.includes('master')) return 'Card';
      if (lower.includes('rocket')) return 'Rocket';
      if (lower.includes('bank')) return 'Bank Transfer';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const methodTotalsMap = new Map<string, { count: number; amount: number }>();
    ['Cash', 'Card', 'bKash', 'Nagad'].forEach(m => methodTotalsMap.set(m, { count: 0, amount: 0 }));

    for (const order of orders) {
      const norm = normalizePaymentMethod(order.payment_method);
      const existing = methodTotalsMap.get(norm) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += parseFloat(order.total_amount) || 0;
      methodTotalsMap.set(norm, existing);
    }

    const paymentMethodsSummary = Array.from(methodTotalsMap.entries()).map(([method_name, data]) => ({
      method_name,
      count: data.count,
      amount: data.amount,
      percentage: totalSales > 0 ? (data.amount / totalSales) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalSales,
        totalOrders: orders.length,
        totalPurchase,
        totalPurchaseOrders: purchases.length,
        totalExpense,
        totalGrossProfit: grossProfit,
        totalNetProfit: netProfit,
        totalDue,
        totalDueCollection,
        lowStockCount: lowStockProducts.length,
        totalItemsSold,
        totalReturns,
        businessNetAmount,
        pettyCashBalance,
        openingBalance,
        cashIn,
        cashOut,
        closingBalance,
      },
      sales: {
        orders,
        totalSales,
        totalDiscount,
        totalVat,
        totalPaid,
        totalDue,
      },
      purchases: {
        items: purchases,
        totalAmount: totalPurchase,
        totalQuantity: totalPurchaseQuantity,
        totalOrders: purchases.length,
      },
      expenses: {
        items: expenses,
        totalAmount: totalExpense,
        byCategory: expensesByCategory,
      },
      profit: {
        grossSales: totalSales,
        cogs,
        grossProfit,
        totalExpenses: totalExpense,
        netProfit,
        profitMargin,
      },
      dues: {
        orders: dueOrders,
        totalDue,
        dueCount: dueOrders.length,
      },
      dueCollections: {
        orders: dueCollections,
        totalCollected: totalDueCollection,
        collectionCount: dueCollections.length,
      },
      bestSellingProducts,
      lowStockProducts,
      paymentMethodSales: {
        methods: paymentMethodsSummary,
        orders,
        totalSales,
      },
    };
  });


  // Sync handlers
  ipcMain.handle(IPC_CHANNELS.SYNC_START, async (_, dryRun = false) => {
    const sync = getSyncService();
    return await sync.startSync(dryRun);
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, () => {
    const sync = getSyncService();
    return sync.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_GET_HISTORY, async (_, limit = 20) => {
    const sync = getSyncService();
    return await sync.getSyncHistory(limit);
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_DRY_RUN, async () => {
    const sync = getSyncService();
    return await sync.startSync(true);
  });

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    const db = getDatabaseService().getDatabase();

    const settings = db.prepare(`
      SELECT * FROM app_settings WHERE id = 1
    `).get() as any;

    // Map snake_case to camelCase
    if (settings) {
      return {
        apiBaseUrl: settings.api_base_url,
        storeId: settings.store_id,
        autoSyncEnabled: !!settings.auto_sync_enabled,
        syncIntervalMinutes: settings.sync_interval_minutes,
        taxRate: settings.tax_rate,
        receiptCompanyName: settings.receipt_company_name,
        receiptCompanyAddress: settings.receipt_company_address,
        receiptCompanyPhone: settings.receipt_company_phone,
        lowStockThreshold: settings.low_stock_threshold,
        showStockBadge: !!settings.show_stock_badge,
        showProductTitle: !!settings.show_product_title,
        showProductPrice: !!settings.show_product_price,
        showSaleModal: !!settings.show_sale_modal,
        zatcaPhase: settings.zatca_phase || 1,
        vatNumber: settings.vat_registration_number || '',
        crNumber: settings.commercial_registration_number || '',
        country: settings.country || 'Bangladesh',
        binNumber: settings.bin_number || '',
        uaeTrn: settings.uae_trn || '',
        kuwaitTaxId: settings.kuwait_tax_id || '',
        qrCodeSize: settings.qr_code_size || 256,
        qrCodeMargin: settings.qr_code_margin || 3,
        isTaxInclusive: !!settings.is_tax_inclusive,
      };
    }

    return null;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, settings) => {
    const db = getDatabaseService().getDatabase();

    console.log('[SETTINGS_UPDATE] Receiving settings:', settings);

    // Map properties from both camelCase and snake_case
    const showStockBadge = settings.showStockBadge !== undefined 
      ? settings.showStockBadge 
      : (settings.show_stock_badge !== undefined ? !!settings.show_stock_badge : true);
    
    const showProductTitle = settings.showProductTitle !== undefined 
      ? settings.showProductTitle 
      : (settings.show_product_title !== undefined ? !!settings.show_product_title : true);
    
    const showProductPrice = settings.showProductPrice !== undefined 
      ? settings.showProductPrice 
      : (settings.show_product_price !== undefined ? !!settings.show_product_price : true);
    
    const showSaleModal = settings.showSaleModal !== undefined 
      ? settings.showSaleModal 
      : (settings.show_sale_modal !== undefined ? !!settings.show_sale_modal : true);

    try {
      const current = db.prepare('SELECT * FROM app_settings WHERE id = 1').get() as any;

      db.prepare(`
        UPDATE app_settings SET 
            api_base_url = ?, store_id = ?, auto_sync_enabled = ?, sync_interval_minutes = ?, 
            tax_rate = ?, receipt_company_name = ?, receipt_company_address = ?, receipt_company_phone = ?, 
            low_stock_threshold = ?, show_stock_badge = ?, show_product_title = ?, show_product_price = ?,
            show_sale_modal = ?, zatca_phase = ?, vat_registration_number = ?, 
            commercial_registration_number = ?, country = ?, bin_number = ?, uae_trn = ?, 
            kuwait_tax_id = ?, qr_code_size = ?, qr_code_margin = ?, is_tax_inclusive = ?, updated_at = ?
        WHERE id = 1
      `).run(
        settings.apiBaseUrl ?? settings.api_base_url ?? current?.api_base_url ?? null,
        settings.storeId ?? settings.store_id ?? current?.store_id ?? 1,
        (settings.autoSyncEnabled !== undefined ? settings.autoSyncEnabled : settings.auto_sync_enabled ?? current?.auto_sync_enabled) ? 1 : 0,
        settings.syncIntervalMinutes ?? settings.sync_interval_minutes ?? current?.sync_interval_minutes ?? 5,
        settings.taxRate ?? settings.tax_rate ?? current?.tax_rate ?? 0,
        settings.receiptCompanyName ?? settings.receipt_company_name ?? current?.receipt_company_name ?? '',
        settings.receiptCompanyAddress ?? settings.receipt_company_address ?? current?.receipt_company_address ?? '',
        settings.receiptCompanyPhone ?? settings.receipt_company_phone ?? current?.receipt_company_phone ?? '',
        settings.lowStockThreshold ?? settings.low_stock_threshold ?? current?.low_stock_threshold ?? 10,
        showStockBadge ? 1 : 0,
        showProductTitle ? 1 : 0,
        showProductPrice ? 1 : 0,
        showSaleModal ? 1 : 0,
        settings.zatcaPhase ?? current?.zatca_phase ?? 1,
        settings.vatNumber ?? settings.vat_registration_number ?? current?.vat_registration_number ?? '',
        settings.crNumber ?? settings.commercial_registration_number ?? current?.commercial_registration_number ?? '',
        settings.country ?? current?.country ?? 'Bangladesh',
        settings.binNumber ?? settings.bin_number ?? current?.bin_number ?? '',
        settings.uaeTrn ?? settings.uae_trn ?? current?.uae_trn ?? '',
        settings.kuwaitTaxId ?? settings.kuwait_tax_id ?? current?.kuwait_tax_id ?? '',
        settings.qrCodeSize ?? settings.qr_code_size ?? current?.qr_code_size ?? 256,
        settings.qrCodeMargin ?? settings.qr_code_margin ?? current?.qr_code_margin ?? 3,
        (settings.isTaxInclusive !== undefined ? settings.isTaxInclusive : settings.is_tax_inclusive ?? current?.is_tax_inclusive) ? 1 : 0,
        new Date().toISOString()
      );

      console.log('[SETTINGS_UPDATE] Settings saved successfully. isTaxInclusive:', (settings.isTaxInclusive !== undefined ? settings.isTaxInclusive : settings.is_tax_inclusive));
    } catch (error) {
      console.error('[SETTINGS_UPDATE] ERROR saving settings:', error);
      throw error;
    }

    // Update auto-sync if enabled
    const sync = getSyncService();
    const autoSyncEnabled = settings.autoSyncEnabled !== undefined ? settings.autoSyncEnabled : settings.auto_sync_enabled;
    const syncInterval = settings.syncIntervalMinutes || settings.sync_interval_minutes || 5;
    
    if (autoSyncEnabled) {
      console.log('[SETTINGS_UPDATE] Starting auto-sync with interval:', syncInterval, 'minutes');
      sync.startAutoSync(syncInterval);
    } else {
      console.log('[SETTINGS_UPDATE] Stopping auto-sync');
      sync.stopAutoSync();
    }

    return { success: true };
  });

  // App handlers
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return process.env.npm_package_version || '2.0.0';
  });

  // API Configuration handlers
  ipcMain.handle('api:get-base-url', () => {
    const api = getApiService();
    return api.getBaseURL();
  });

  ipcMain.handle('api:update-base-url', (_, newBaseURL: string) => {
    const api = getApiService();
    api.updateBaseURL(newBaseURL);
    return { success: true, baseURL: newBaseURL };
  });

  ipcMain.handle(IPC_CHANNELS.APP_EXPORT_DB, async (_, exportPath) => {
    const db = getDatabaseService();
    db.exportDatabase(exportPath);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.APP_IMPORT_DB, async (_, importPath) => {
    const db = getDatabaseService();
    db.importDatabase(importPath);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.APP_RESET_DB, async () => {
    try {
      console.log('🔄 Resetting database...');
      const db = getDatabaseService();
      
      // Reset will close, delete, and reinitialize the database
      db.reset();
      
      // Verify database is ready
      const database = db.getDatabase();
      if (!database) {
        throw new Error('Failed to reinitialize database after reset');
      }
      
      console.log('✅ Database reset and reinitialized successfully');
      return { success: true, message: 'Database reset successfully. You can now sync to reload data.' };
    } catch (error: any) {
      console.error('❌ Database reset failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear sync queue
  ipcMain.handle('db:clear-sync-queue', async () => {
    const db = getDatabaseService().getDatabase();
    const result = db.prepare('DELETE FROM sync_queue WHERE synced_at IS NULL').run();
    console.log(`✅ Cleared ${result.changes} pending sync items`);
    return { success: true, cleared: result.changes };
  });

  // Print invoice
  ipcMain.handle('print:invoice', async (_event, htmlContent: string) => {
    const { BrowserWindow } = require('electron');
    
    // Create a tiny but "on-screen" window
    // This forces Windows to actually "render" the text so it isn't white paper.
    const printWindow = new BrowserWindow({
      show: true,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    console.log('[MAIN-PRINT] 🛒 Received print request from renderer');
    
    // Create a temporary file path
    const tempFilePath = path.join(os.tmpdir(), `karbar_print_${Date.now()}.html`);
    
    try {
      // 1. Write content to a real file
      fs.writeFileSync(tempFilePath, htmlContent);
      console.log('[MAIN-PRINT] 📄 Temporary print file created');

      // 2. Load the file
      await printWindow.loadURL(`file://${tempFilePath}`);
      
      // 3. Give it a solid two seconds to render everything perfectly
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // 4. Get printers directly
      const printers = await printWindow.webContents.getPrintersAsync();
      const defaultPrinter = printers.find((p: any) => p.isDefault) || printers[0];
      
      console.log('[MAIN-PRINT] 🎯 Targeting printer:', defaultPrinter?.name || 'Default');

      // 5. Execute silent print with explicit 80mm size
      await printWindow.webContents.print({
        silent: true,
        deviceName: defaultPrinter?.name || '',
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: {
          width: 80000,
          height: 250000 
        }
      });

      console.log('[MAIN-PRINT] ✅ Job sent to spooler successfully');
      
      // 6. Cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (!printWindow.isDestroyed()) printWindow.close();
      return { success: true };
    } catch (error: any) {
      console.error('[PRINT] CRITICAL ERROR:', error);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (!printWindow.isDestroyed()) printWindow.close();
      return { success: false, error: error.message };
    }
  });

  // Generate invoice HTML
  ipcMain.handle('invoice:generate', async (_event, orderId: string | number) => {
    const db = getDatabaseService().getDatabase();
    const { getInvoiceService } = require('../services/invoice.service');
    
    try {
      // Get order with store name
      const order = db.prepare(`
        SELECT 
          orders.*,
          stores.name as store_name,
          customers.phone as customer_phone
        FROM orders
        LEFT JOIN stores ON orders.store_id = stores.id
        LEFT JOIN customers ON orders.customer_id = customers.id
        WHERE orders.id = ? OR orders.local_id = ?
      `).get(orderId, orderId) as any;

      if (!order) {
        throw new Error('Order not found');
      }

      // Get order items
      const orderItems = db.prepare(`
        SELECT * FROM order_items WHERE order_id = ?
      `).all(order.id) as any[];

      // Get site settings
      const siteSettings = db.prepare(`
        SELECT * FROM site_settings WHERE id = 1
      `).get() as any;

      // Get app settings
      const appSettings = db.prepare(`
        SELECT * FROM app_settings WHERE id = 1
      `).get() as any;

      // Generate invoice HTML
      const invoiceService = getInvoiceService();
      const html = await invoiceService.generateInvoiceHTML(order, orderItems, siteSettings || {}, appSettings || {});

      return { success: true, html };
    } catch (error: any) {
      console.error('Generate invoice error:', error);
      throw error;
    }
  });

  // Update store_id for all products (migration helper)
  ipcMain.handle('db:update-products-store-id', async (_, newStoreId: number) => {
    const db = getDatabaseService().getDatabase();
    const result = db.prepare(`
      UPDATE products SET store_id = ? WHERE store_id != ?
    `).run(newStoreId, newStoreId);
    
    console.log(`✅ Updated ${result.changes} products to store_id ${newStoreId}`);
    return { success: true, updated: result.changes };
  });
}
