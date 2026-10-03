import { getDatabaseService } from '../database';
import Database from 'better-sqlite3';

/**
 * Local Data Service
 * 
 * All CRUD operations use LOCAL DATABASE ONLY
 * NO network calls - works completely offline
 * Fast and reliable
 */
export class LocalDataService {
  private getDb(): Database.Database {
    return getDatabaseService().getDatabase();
  }

  // ==================== PRODUCTS ====================

  /**
   * Get products from local database with pagination
   */
  public getProducts(params: {
    page?: number;
    perPage?: number;
    search?: string;
    category_id?: number;
    store_id?: number;
  }): any {
    const db = this.getDb();
    const { page = 1, perPage = 20, search, category_id, store_id } = params;
    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM products WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      query += ' AND (product_name LIKE ? OR sku_code LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      query += ' AND category_id = ?';
      queryParams.push(category_id);
    }

    if (store_id) {
      query += ' AND store_id = ?';
      queryParams.push(store_id);
    }

    query += ' ORDER BY product_name ASC LIMIT ? OFFSET ?';
    queryParams.push(perPage, offset);

    const products = db.prepare(query).all(...queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countQuery += ' AND (product_name LIKE ? OR sku_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      countQuery += ' AND category_id = ?';
      countParams.push(category_id);
    }

    if (store_id) {
      countQuery += ' AND store_id = ?';
      countParams.push(store_id);
    }

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return {
      data: products,
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Search products by barcode or name
   */
  public searchProducts(searchTerm: string): any[] {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM products
      WHERE product_name LIKE ? OR sku_code LIKE ?
      ORDER BY product_name ASC
      LIMIT 50
    `).all(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  /**
   * Get single product by ID or SKU
   */
  public getProduct(idOrSku: string | number): any {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM products WHERE id = ? OR sku_code = ?
    `).get(idOrSku, idOrSku);
  }

  // ==================== CATEGORIES ====================

  /**
   * Get all categories from local database
   */
  public getCategories(): any[] {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM categories ORDER BY name ASC
    `).all();
  }

  // ==================== CUSTOMERS ====================

  /**
   * Get all customers from local database
   */
  public getCustomers(): any[] {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM customers ORDER BY name ASC
    `).all();
  }

  /**
   * Create new customer (saved locally)
   */
  public createCustomer(customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }): any {
    const db = this.getDb();
    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, address)
      VALUES (?, ?, ?, ?)
    `).run(customer.name, customer.email, customer.phone, customer.address);

    return db.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).get(result.lastInsertRowid);
  }

  // ==================== ORDERS ====================

  /**
   * Create order (saved locally, synced later)
   */
  public createOrder(orderData: any): any {
    const db = this.getDb();
    const localId = this.generateUUID();

    const createOrder = db.transaction((data: any) => {
      // Get user ID from auth (default to 1 if not available)
      const userId = 1; // TODO: Get from auth service
      const salesmanId = data.billed_by || userId;

      // Insert order
      const orderResult = db.prepare(`
        INSERT INTO orders (
          local_id, customer_id, customer_name, store_id, sub_total, 
          discount_amount, discount_type, vat, vat_amount, total_quantity,
          total_amount, payment_method, paid_amount, change_amount,
          payment_status, status, order_type, shipping_address, note, billed_by, salesman_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        localId,
        data.customer_id || 1,
        data.customer_name || 'Walk in Customer',
        data.store_id || 1,
        data.sub_total,
        data.discount_amount || 0,
        data.discount_type || 'flat',
        data.vat || '0',
        data.vat_amount || 0,
        data.total_quantity,
        data.total_amount,
        data.payment_method,
        data.paid_amount,
        data.change_amount || 0,
        data.payment_status || 'paid',
        data.status || 'completed',
        data.order_type || 'pos',
        data.shipping_address || '',
        data.note || '',
        salesmanId,
        salesmanId
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, order_local_id, product_id, product_name, product_variant_id,
          sku_code, variant_attributes, quantity, price, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          item.total
        );

        // Update product stock
        db.prepare(`
          UPDATE products
          SET available_stock = available_stock - ?
          WHERE product_id = ?
        `).run(item.quantity, item.product_id);
      }

      // Add to sync queue for later upload
      db.prepare(`
        INSERT INTO sync_queue (entity_type, entity_local_id, action, payload)
        VALUES (?, ?, ?, ?)
      `).run('order', localId, 'create', JSON.stringify({ local_id: localId }));

      return orderId;
    });

    const orderId = createOrder(orderData);

    const order = db.prepare(`
      SELECT * FROM orders WHERE id = ?
    `).get(orderId) as any;

    if (!order) {
      throw new Error('Order not found');
    }

    // Return order with items for invoice generation
    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all(orderId);

    return { ...order, items };
  }

  /**
   * Get orders from local database
   */
  public getOrders(params: {
    page?: number;
    perPage?: number;
    status?: string;
    synced?: boolean;
  }): any {
    const db = this.getDb();
    const { page = 1, perPage = 20, status, synced } = params;
    const offset = (page - 1) * perPage;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const queryParams: any[] = [];

    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (synced !== undefined) {
      query += synced ? ' AND synced_at IS NOT NULL' : ' AND synced_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(perPage, offset);

    const orders = db.prepare(query).all(...queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (synced !== undefined) {
      countQuery += synced ? ' AND synced_at IS NOT NULL' : ' AND synced_at IS NULL';
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
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Get payment methods from local database
   */
  public getPaymentMethods(): any[] {
    const db = this.getDb();
    try {
      return db.prepare(`
        SELECT * FROM payment_methods ORDER BY sort_order ASC
      `).all();
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  // ==================== SETTINGS ====================

  /**
   * Get app settings from local database
   */
  public getSettings(): any {
    const db = this.getDb();
    return db.prepare(`
      SELECT * FROM app_settings WHERE id = 1
    `).get();
  }

  /**
   * Update app settings
   */
  public updateSettings(settings: any): void {
    const db = this.getDb();
    db.prepare(`
      UPDATE app_settings
      SET store_id = ?, auto_sync_enabled = ?, sync_interval_minutes = ?,
          tax_rate = ?, receipt_company_name = ?, receipt_company_address = ?,
          receipt_company_phone = ?, low_stock_threshold = ?, updated_at = ?
      WHERE id = 1
    `).run(
      settings.store_id,
      settings.auto_sync_enabled ? 1 : 0,
      settings.sync_interval_minutes,
      settings.tax_rate,
      settings.receipt_company_name,
      settings.receipt_company_address,
      settings.receipt_company_phone,
      settings.low_stock_threshold,
      new Date().toISOString()
    );
  }

  // ==================== UTILITIES ====================

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Singleton instance
let localDataService: LocalDataService | null = null;

export function getLocalDataService(): LocalDataService {
  if (!localDataService) {
    localDataService = new LocalDataService();
  }
  return localDataService;
}
