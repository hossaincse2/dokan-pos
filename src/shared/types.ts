// Shared types used across main and renderer processes

export interface Product {
  id: number;
  product_id: number;
  sku_code: string;
  product_name: string;
  unit_price: number;
  sale_price: number;
  final_sale_price: number;
  variant_id: number | null;
  variant_sku: string | null;
  variant_attributes: string | null;
  additional_price: number | null;
  available_stock: number;
  preview_image: string | null;
  image_preview_style: string;
  category_id?: number;
  store_id?: number;
  cost?: number;
  remote_id?: number;
  vat_percentage?: number;
  vat_sales_price?: number;
  vat_price?: number;
  updated_at?: string;
  synced_at?: string | null;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  remote_id?: number;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  remote_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  remote_id?: number;
}

export interface Order {
  id?: number;
  local_id: string;
  remote_id?: number | null;
  customer_id?: number | null;
  customer_name?: string;
  store_id: number;
  sub_total: number;
  discount_amount: number;
  discount_type: 'flat' | 'percentage';
  vat: string;
  vat_amount: number;
  total_quantity: number;
  total_amount: number;
  payment_method: string;
  paid_amount: number;
  change_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  status: 'draft' | 'completed' | 'cancelled';
  order_type: 'pos' | 'online';
  shipping_address?: string;
  note?: string;
  billed_by: number;
  salesman_id?: number;
  is_tax_inclusive?: boolean;
  transaction_id?: string;
  created_at: string;
  synced_at?: string | null;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  order_local_id?: string;
  product_id: number;
  product_name: string;
  product_variant_id?: number | null;
  sku_code: string;
  variant_attributes?: string | null;
  quantity: number;
  price: number;
  total: number;
}

export interface CartItem extends Omit<OrderItem, 'id' | 'order_id' | 'order_local_id'> {
  product: Product;
}

export interface SyncQueueItem {
  id?: number;
  entity_type: 'order' | 'stock_adjustment' | 'return';
  entity_local_id: string;
  action: 'create' | 'update' | 'delete';
  payload: string; // JSON string
  attempts: number;
  last_attempt_at?: string | null;
  error_message?: string | null;
  created_at: string;
  synced_at?: string | null;
}

export interface AppMeta {
  key: string;
  value: string;
}

export interface LoginCredentials {
  email_username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    username?: string;
    role?: string;
    created_at?: string;
  };
  token?: string;
  access_token: string;
  offline_mode?: boolean;
}

export interface ProductsApiResponse {
  data: Product[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface SyncStatus {
  isRunning: boolean;
  lastSyncAt: string | null;
  queueCount: number;
  progress: number;
  currentAction?: string;
  error?: string | null;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
  timestamp: string;
}

export interface AppSettings {
  apiBaseUrl?: string;
  storeId: number;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  taxRate: number;
  receiptCompanyName: string;
  receiptCompanyAddress: string;
  receiptCompanyPhone: string;
  lowStockThreshold: number;
  showStockBadge: boolean;
  showProductTitle: boolean;
  showProductPrice: boolean;
  showSaleModal: boolean;
  zatcaPhase: number;
  vatNumber: string;
  crNumber: string;
  binNumber?: string;
  uaeTrn?: string;
  kuwaitTaxId?: string;
  qrCodeSize?: number;
  qrCodeMargin?: number;
  country: string;
  isTaxInclusive: boolean;
}

export interface Expense {
  id?: number;
  remote_id?: number | null;
  type: string;
  category?: string;
  amount: number;
  expense_date: string;
  description?: string;
  expense_by?: number;
  expense_by_name?: string;
  store_id?: number;
  is_petty_cash?: boolean | number;
  is_synced?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface Purchase {
  id?: number;
  remote_id?: number | null;
  challan_no: string;
  supplier_name: string;
  status: string;
  purchase_type?: string;
  total_quantity: number;
  total_amount: number;
  store_id?: number;
  purchase_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportFilter {
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  storeId?: number;
}

export interface BestSellingProductItem {
  product_id: number;
  product_name: string;
  sku_code: string;
  category_name?: string;
  quantity_sold: number;
  unit_price: number;
  sale_price: number;
  total_revenue: number;
  estimated_profit: number;
}

export interface LowStockProductItem {
  id: number;
  product_id: number;
  product_name: string;
  sku_code: string;
  barcode?: string;
  category_name?: string;
  available_stock: number;
  unit_price: number;
  sale_price: number;
  final_sale_price: number;
  status: 'out_of_stock' | 'critical' | 'low';
}

export interface PaymentMethodSaleItem {
  method_name: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ReportSummary {
  totalSales: number;
  totalOrders: number;
  totalPurchase: number;
  totalPurchaseOrders: number;
  totalExpense: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  totalDue: number;
  totalDueCollection: number;
  lowStockCount: number;
  totalItemsSold: number;
  totalReturns?: number;
  businessNetAmount?: number;
  pettyCashBalance?: number;
  openingBalance?: number;
  cashIn?: number;
  cashOut?: number;
  closingBalance?: number;
}

export interface ReportsData {
  summary: ReportSummary;
  sales: {
    orders: any[];
    totalSales: number;
    totalDiscount: number;
    totalVat: number;
    totalPaid: number;
    totalDue: number;
  };
  purchases: {
    items: Purchase[];
    totalAmount: number;
    totalQuantity: number;
    totalOrders: number;
  };
  expenses: {
    items: Expense[];
    totalAmount: number;
    byCategory: { category: string; amount: number; count: number }[];
  };
  profit: {
    grossSales: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  dues: {
    orders: any[];
    totalDue: number;
    dueCount: number;
  };
  dueCollections: {
    orders: any[];
    totalCollected: number;
    collectionCount: number;
  };
  bestSellingProducts: BestSellingProductItem[];
  lowStockProducts: LowStockProductItem[];
  paymentMethodSales: {
    methods: PaymentMethodSaleItem[];
    orders: any[];
    totalSales: number;
  };
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHECK: 'auth:check',
  
  // Database operations
  DB_QUERY: 'db:query',
  DB_GET_PRODUCTS: 'db:get-products',
  DB_GET_PRODUCT: 'db:get-product',
  DB_SEARCH_PRODUCTS: 'db:search-products',
  DB_GET_STORES: 'db:get-stores',
  DB_GET_CATEGORIES: 'db:get-categories',
  DB_GET_CUSTOMERS: 'db:get-customers',
  DB_CREATE_CUSTOMER: 'db:create-customer',
  DB_GET_EMPLOYEES: 'db:get-employees',
  DB_GET_PAYMENT_METHODS: 'db:get-payment-methods',
  DB_GET_SITE_SETTINGS: 'db:get-site-settings',
  
  // Expenses
  DB_GET_EXPENSES: 'db:get-expenses',
  DB_CREATE_EXPENSE: 'db:create-expense',
  DB_DELETE_EXPENSE: 'db:delete-expense',
  DB_GET_EXPENSE_TYPES: 'db:get-expense-types',

  // Purchases
  DB_GET_PURCHASES: 'db:get-purchases',

  // Reports
  DB_GET_REPORTS: 'db:get-reports',
  
  // Orders
  POS_CREATE_ORDER: 'pos:create-order',
  POS_GET_ORDERS: 'pos:get-orders',
  POS_GET_ORDER: 'pos:get-order',
  POS_UPDATE_ORDER: 'pos:update-order',
  
  // Sync
  SYNC_START: 'sync:start',
  SYNC_STATUS: 'sync:status',
  SYNC_GET_HISTORY: 'sync:get-history',
  SYNC_DRY_RUN: 'sync:dry-run',
  
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  
  // App
  APP_GET_VERSION: 'app:get-version',
  APP_EXPORT_DB: 'app:export-db',
  APP_IMPORT_DB: 'app:import-db',
  APP_RESET_DB: 'app:reset-db',
  
  // Print
  PRINT_RECEIPT: 'print:receipt',
  PRINT_TO_PDF: 'print:to-pdf',
  PRINT_INVOICE: 'print:invoice',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

