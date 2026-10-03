import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

console.log('[Preload] Starting preload script...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (credentials: any) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
  checkAuth: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHECK),

  // Products
  getProducts: (params?: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PRODUCTS, params),
  getProduct: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PRODUCT, id),
  searchProducts: (params: string | { searchTerm: string; storeId?: number }) => ipcRenderer.invoke(IPC_CHANNELS.DB_SEARCH_PRODUCTS, params),

  // Stores
  getStores: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_STORES),
  
  // Categories
  getCategories: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_CATEGORIES),

  // Customers
  getCustomers: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_CUSTOMERS),
  createCustomer: (customer: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_CREATE_CUSTOMER, customer),
  
  // Employees
  getEmployees: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_EMPLOYEES),

  // Payment Methods
  getPaymentMethods: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PAYMENT_METHODS),

  // Site Settings
  getSiteSettings: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_SITE_SETTINGS),

  // Expenses
  getExpenses: (params?: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_EXPENSES, params),
  createExpense: (expense: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_CREATE_EXPENSE, expense),
  deleteExpense: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_DELETE_EXPENSE, id),
  getExpenseTypes: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_EXPENSE_TYPES),

  // Purchases
  getPurchases: (params?: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PURCHASES, params),

  // Reports
  getReports: (params?: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_REPORTS, params),

  // Orders
  createOrder: (orderData: any) => ipcRenderer.invoke(IPC_CHANNELS.POS_CREATE_ORDER, orderData),
  getOrders: (params?: any) => ipcRenderer.invoke(IPC_CHANNELS.POS_GET_ORDERS, params),
  getOrder: (orderId: string | number) => ipcRenderer.invoke(IPC_CHANNELS.POS_GET_ORDER, orderId),

  // Sync
  startSync: (dryRun?: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_START, dryRun),
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS),
  getSyncHistory: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_HISTORY, limit),
  dryRunSync: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_DRY_RUN),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // App
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  exportDb: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_EXPORT_DB, path),
  importDb: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_IMPORT_DB, path),
  resetDb: () => ipcRenderer.invoke(IPC_CHANNELS.APP_RESET_DB),

  // API Configuration
  getApiBaseUrl: () => ipcRenderer.invoke('api:get-base-url'),
  updateApiBaseUrl: (newBaseURL: string) => ipcRenderer.invoke('api:update-base-url', newBaseURL),

  // Print
  printInvoice: (htmlContent: string) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_INVOICE, htmlContent),
  generateInvoice: (orderId: string | number) => ipcRenderer.invoke('invoice:generate', orderId),

  // Database utilities
  updateProductsStoreId: (newStoreId: number) => ipcRenderer.invoke('db:update-products-store-id', newStoreId),

  // Event listeners
  onSyncProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('sync:progress', (_, data) => callback(data));
  },
  onSyncStatusChanged: (callback: (data: any) => void) => {
    ipcRenderer.on('sync:status-changed', (_, data) => callback(data));
  },
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_, path) => callback(path));
  },
  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('show-about', () => callback());
  },
  onTokenExpired: (callback: () => void) => {
    ipcRenderer.on('auth:token-expired', () => callback());
  },
  onReconnected: (callback: () => void) => {
    ipcRenderer.on('auth:reconnected', () => callback());
  },

  // Remove listeners
  removeListener: (channel: string, callback: any) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

console.log('[Preload] electronAPI exposed successfully');

// TypeScript declaration for window object
declare global {
  interface Window {
    electronAPI: {
      login: (credentials: any) => Promise<any>;
      logout: () => Promise<any>;
      checkAuth: () => Promise<any>;
      getProducts: (params?: any) => Promise<any>;
      getProduct: (id: number) => Promise<any>;
      searchProducts: (params: string | { searchTerm: string; storeId?: number }) => Promise<any>;
      getCategories: () => Promise<any>;
      getCustomers: () => Promise<any>;
      createCustomer: (customer: any) => Promise<any>;
      getPaymentMethods: () => Promise<any>;
      getSiteSettings: () => Promise<any>;
      createExpense: (expense: any) => Promise<any>;
      deleteExpense: (id: number) => Promise<any>;
      getExpenseTypes: () => Promise<string[]>;
      getPurchases: (params?: any) => Promise<any>;
      getReports: (params?: any) => Promise<any>;
      createOrder: (orderData: any) => Promise<any>;
      getOrders: (params?: any) => Promise<any>;
      getOrder: (orderId: string | number) => Promise<any>;
      startSync: (dryRun?: boolean) => Promise<any>;
      getSyncStatus: () => Promise<any>;
      getSyncHistory: (limit?: number) => Promise<any>;
      dryRunSync: () => Promise<any>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      getVersion: () => Promise<string>;
      exportDb: (path: string) => Promise<any>;
      importDb: (path: string) => Promise<any>;
      resetDb: () => Promise<any>;
      getApiBaseUrl: () => Promise<string>;
      updateApiBaseUrl: (newBaseURL: string) => Promise<{ success: boolean; baseURL: string }>;
      printInvoice: (htmlContent: string) => Promise<any>;
      generateInvoice: (orderId: string | number) => Promise<{ success: boolean; html: string }>;
      onSyncProgress: (callback: (data: any) => void) => void;
      onSyncStatusChanged: (callback: (data: any) => void) => void;
      onNavigate: (callback: (path: string) => void) => void;
      onShowAbout: (callback: () => void) => void;
      onTokenExpired: (callback: () => void) => void;
      onReconnected?: (callback: () => void) => void;
      removeListener: (channel: string, callback: any) => void;
    };
  }
}
