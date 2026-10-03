"use strict";
// Shared types used across main and renderer processes
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// IPC Channel names
exports.IPC_CHANNELS = {
    // Auth
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_CHECK: 'auth:check',
    // Database operations
    DB_QUERY: 'db:query',
    DB_GET_PRODUCTS: 'db:get-products',
    DB_GET_PRODUCT: 'db:get-product',
    DB_SEARCH_PRODUCTS: 'db:search-products',
    DB_GET_CATEGORIES: 'db:get-categories',
    DB_GET_CUSTOMERS: 'db:get-customers',
    DB_CREATE_CUSTOMER: 'db:create-customer',
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
};
