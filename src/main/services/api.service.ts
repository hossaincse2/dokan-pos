import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { LoginCredentials, LoginResponse, ProductsApiResponse } from '../../shared/types';
import Store from 'electron-store';

const store = new Store();

export class ApiService {
  private client: AxiosInstance;
  private baseURL: string;
  private mainWindow: any = null;

  constructor(baseURL?: string) {
    // Priority: 1. Passed parameter, 2. Stored config, 3. Installer config, 4. Env variable, 5. Default
    let configUrl = baseURL || store.get('apiBaseUrl') as string;
    
    // Check for installer config file (created during installation)
    if (!configUrl) {
      try {
        const { app } = require('electron');
        const fs = require('fs');
        const path = require('path');
        
        // In packaged app, config is in the installation directory
        const configPath = app.isPackaged 
          ? path.join(process.resourcesPath, '..', 'api-config.json')
          : path.join(app.getAppPath(), 'api-config.json');
        
        if (fs.existsSync(configPath)) {
          const configData = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configData);
          configUrl = config.apiBaseUrl;
          console.log('✅ Loaded API URL from installer config:', configUrl);
        }
      } catch (error) {
        console.log('No installer config found, using defaults');
      }
    }
    
    this.baseURL = configUrl || 
                   process.env.API_BASE_URL || 
                   'http://127.0.0.1:8000';
    
    // Save to store if not already saved
    if (!store.get('apiBaseUrl')) {
      store.set('apiBaseUrl', this.baseURL);
      console.log('✅ Saved API URL to store:', this.baseURL);
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error('🚫 401 Unauthorized - Token expired or invalid');
          // Token expired or invalid - clear token and notify renderer
          this.handleTokenExpiry();
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    return store.get('auth_token') as string | null;
  }

  private setToken(token: string): void {
    store.set('auth_token', token);
  }

  private clearToken(): void {
    store.delete('auth_token');
    store.delete('user');
  }

  private handleTokenExpiry(): void {
    console.log('🔓 Handling token expiry - clearing auth and notifying renderer');
    
    // Clear token and user data
    this.clearToken();
    
    // Clear user from database
    try {
      const { getDatabaseService } = require('../database');
      const db = getDatabaseService().getDatabase();
      db.prepare('DELETE FROM users').run();
      console.log('✅ Cleared users from local database');
    } catch (error) {
      console.error('⚠️ Failed to clear users from database:', error);
    }
    
    // Notify renderer to logout
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('auth:token-expired');
      console.log('📤 Sent token-expired event to renderer');
    }
  }

  public setMainWindow(window: any): void {
    this.mainWindow = window;
  }

  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 Attempting online login to API:', this.baseURL);
      console.log('📧 Username/Email:', credentials.email_username);
      console.log('🌐 Full URL:', `${this.baseURL}/api/login`);
      
      // Try online login first
      const response = await this.client.post<any>('/api/login', credentials, {
        timeout: 5000, // 5 second timeout for login
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📦 Response data:', response.data);
      console.log('📋 Response headers:', response.headers);
      
      // Check if response is HTML (error page)
      const contentType = String(response.headers['content-type'] || '');
      if (contentType.includes('text/html')) {
        console.error('❌ Received HTML response instead of JSON');
        console.error('🔍 This usually means the API endpoint is incorrect or the server returned an error page');
        throw new Error('Invalid API endpoint. Please check your API URL configuration.');
      }
      
      // Check for error responses
      if (response.status >= 400) {
        const errorMessage = response.data?.message || response.data?.error || 'Login failed';
        throw new Error(errorMessage);
      }
      
      console.log('✅ Online login successful');
      
      // Handle both token and access_token from API
      const token = response.data.token || response.data.access_token;
      const user = response.data.user;
      
      if (!token) {
        throw new Error('No authentication token received from server');
      }
      
      if (!user) {
        throw new Error('No user data received from server');
      }
      
      // Save token and user to electron-store (persistent)
      this.setToken(token);
      store.set('user', user);
      store.set('offline_mode', false);
      console.log('✅ Token and user saved to local storage');
      
      // Save user credentials to local database for offline login
      try {
        const { getDatabaseService } = require('../database');
        const db = getDatabaseService().getDatabase();
        
        // Hash password for security (simple base64 for now, use bcrypt in production)
        const passwordHash = Buffer.from(credentials.password).toString('base64');
        
        db.prepare(`
          INSERT OR REPLACE INTO users (
            id, name, email, username, password_hash, role, status, 
            last_login_at, token, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          user.id,
          user.name,
          user.email,
          user.username || credentials.email_username,
          passwordHash,
          user.role || 'user',
          user.status || 'active',
          new Date().toISOString(),
          token,
          user.created_at || new Date().toISOString(),
          new Date().toISOString()
        );
        
        console.log('✅ User credentials saved to local database for offline access');
      } catch (dbError) {
        console.error('⚠️ Failed to save user to local database:', dbError);
        // Don't fail login if database save fails
      }
      
      return {
        success: true,
        message: response.data.message || 'Login successful',
        user: user,
        token: token,
        access_token: token,
        offline_mode: false,
      };
    } catch (error: any) {
      console.error('❌ Online login failed:', error.message);
      
      // Check if response is HTML (wrong endpoint or error page)
      if (error.message?.includes('<!DOCTYPE html>') || error.message?.includes('<html')) {
        console.error('🚫 Received HTML response - API endpoint may be incorrect');
        console.error('🔍 Current API URL:', this.baseURL);
        console.error('🔍 Login endpoint:', `${this.baseURL}/api/login`);
        throw new Error('Invalid API endpoint. The server returned an HTML page instead of JSON. Please verify your API URL in Settings.');
      }
      
      // Check if it's a network error (no internet)
      const isNetworkError = error.code === 'ECONNREFUSED' || 
                            error.code === 'ENOTFOUND' ||
                            error.code === 'ETIMEDOUT' ||
                            error.message?.includes('Network Error') ||
                            error.message?.includes('timeout');
      
      if (isNetworkError) {
        console.log('🔌 No internet connection - attempting offline login...');
        return await this.offlineLogin(credentials);
      }
      
      // If not a network error, it's an authentication error
      this.clearToken();
      
      // Extract error message from API response
      // Note: errors thrown from the validateStatus handler above are plain Errors with the API message,
      // while Axios errors from interceptors have error.response.data
      let errorMessage = error.message || 'Login failed. Please check your credentials.';
      
      if (error.response?.data) {
        // Check if response data is HTML
        const responseData = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        if (responseData.includes('<!DOCTYPE html>') || responseData.includes('<html')) {
          errorMessage = 'Invalid API endpoint. Please check your API URL in Settings.';
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string' && error.response.data.length < 200) {
          errorMessage = error.response.data;
        }
      }
      
      console.error('❌ Login failed:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  private async offlineLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { getDatabaseService } = require('../database');
      const db = getDatabaseService().getDatabase();
      
      // Hash the provided password
      const passwordHash = Buffer.from(credentials.password).toString('base64');
      
      // Check local database for user
      const user = db.prepare(`
        SELECT * FROM users 
        WHERE (username = ? OR email = ?) AND password_hash = ?
        LIMIT 1
      `).get(credentials.email_username, credentials.email_username, passwordHash) as any;
      
      if (!user) {
        throw new Error('Invalid credentials. No internet connection - cannot verify with server.');
      }
      
      console.log('✅ Offline login successful for user:', user.name);
      
      // Use stored token (may be expired, but we're offline)
      const token = user.token || 'offline-token';
      
      // Save to electron-store
      store.set('user', {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      });
      store.set('offline_mode', true);
      store.set('offline_credentials', credentials); // Store for auto-sync when online
      
      // Don't set token in offline mode (will trigger sync when online)
      console.log('📴 Logged in as GUEST (offline mode)');
      console.log('⚠️ Sync disabled until internet connection is restored');
      
      // Update last login
      db.prepare(`
        UPDATE users SET last_login_at = ? WHERE id = ?
      `).run(new Date().toISOString(), user.id);
      
      return {
        success: true,
        message: 'Logged in offline as guest. Sync will resume when internet is available.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        token: token,
        access_token: token,
        offline_mode: true,
      };
    } catch (error: any) {
      console.error('❌ Offline login failed:', error.message);
      throw new Error(error.message || 'Offline login failed. Please connect to internet to login.');
    }
  }

  public isOfflineMode(): boolean {
    return store.get('offline_mode') === true;
  }

  public async checkAndReconnect(): Promise<boolean> {
    try {
      // Check if we're in offline mode
      if (!this.isOfflineMode()) {
        return false;
      }
      
      console.log('🔄 Checking internet connection...');
      
      // Try to ping the API
      await this.client.get('/api/health', { timeout: 3000 });
      
      console.log('✅ Internet connection restored!');
      
      // Get stored offline credentials
      const offlineCredentials = store.get('offline_credentials') as LoginCredentials;
      
      if (offlineCredentials) {
        console.log('🔐 Re-authenticating with server...');
        
        try {
          // Re-login to get fresh token
          await this.login(offlineCredentials);
          
          // Clear offline mode
          store.delete('offline_mode');
          store.delete('offline_credentials');
          
          console.log('✅ Re-authentication successful - now online!');
          
          // Notify renderer
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('auth:reconnected');
          }
          
          return true;
        } catch (error) {
          console.error('❌ Re-authentication failed:', error);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      // Still offline
      return false;
    }
  }

  public logout(): void {
    this.clearToken();
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public getBaseURL(): string {
    return this.baseURL;
  }

  public updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    store.set('apiBaseUrl', newBaseURL);
    
    // Recreate axios client with new base URL
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Re-apply interceptors
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
    
    console.log('✅ API Base URL updated to:', newBaseURL);
  }

  public getUser(): any {
    return store.get('user');
  }

  public async fetchProducts(params: {
    search?: string;
    category_id?: number;
    page?: number;
    perPage?: number;
    store_id?: number;
    available_stock?: boolean;
    billed_by?: number;
  }): Promise<ProductsApiResponse> {
    try {
      const requestParams: any = {
        search: params.search || '',
        category_id: params.category_id || '',
        page: params.page || 1,
        perPage: params.perPage || 12,
        store_id: params.store_id || 1,
        available_stock: params.available_stock !== false,
      };
      
      // Add billed_by parameter only if provided
      if (params.billed_by) {
        requestParams.billed_by = params.billed_by;
      }
      
      console.log('🔍 Fetching products with params:', requestParams);
      console.log('🌐 API URL:', `${this.baseURL}/api/pos/pos-products`);
      
      const response = await this.client.get<ProductsApiResponse>('/api/pos/pos-products', {
        params: requestParams,
      });
      
      console.log('📦 API Response:', {
        dataCount: response.data.data?.length || 0,
        meta: response.data.meta,
      });
      
      return response.data;
    } catch (error) {
      console.error('Fetch products error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchCategories(): Promise<any[]> {
    try {
      console.log('🔍 [API] Fetching categories from:', `${this.baseURL}/api/pos/pos-categories`);
      const response = await this.client.get<{ data: any[] }>('/api/pos/pos-categories');
      const categories = response.data.data || [];
      console.log(`✅ [API] Fetched ${categories.length} categories from API`);
      if (categories.length > 0) {
        console.log('📋 [API] Sample categories:', categories.slice(0, 3).map((c: any) => c.name).join(', '));
      }
      return categories;
    } catch (error) {
      console.error('❌ [API] Fetch categories error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchCustomers(): Promise<any[]> {
    try {
      const response = await this.client.get<{ data: any[] }>('/api/pos/pos-customers');
      return response.data.data || [];
    } catch (error) {
      console.error('Fetch customers error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchEmployees(): Promise<any[]> {
    try {
      console.log('🔍 Fetching employees from:', `${this.baseURL}/api/pos/employees`);
      const response = await this.client.get<{ data: any }>('/api/pos/employees', {
        params: {
          status: 'active',
          sort_by: 'name',
          sort_order: 'asc'
        }
      });
      console.log('📦 Employees API response:', {
        fullData: response.data,
        dataType: typeof response.data.data,
        hasEmployees: response.data.data?.employees ? 'yes' : 'no'
      });
      
      // Handle nested structure: response.data.data.employees
      const employees = response.data.data?.employees || response.data.data || [];
      console.log('✅ Extracted employees:', employees.length, employees);
      return employees;
    } catch (error) {
      console.error('Fetch employees error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchStores(): Promise<any[]> {
    try {
      const response = await this.client.get<{ data: any[] }>('/api/pos/pos-store');
      return response.data.data || [];
    } catch (error) {
      console.error('Fetch stores error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchPaymentMethods(): Promise<any[]> {
    try {
      const response = await this.client.get<{ data: any[] }>('/api/pos/pos-payment-method');
      return response.data.data || [];
    } catch (error) {
      console.error('Fetch payment methods error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchSiteSettings(): Promise<any> {
    try {
      const response = await this.client.get<{ data: any }>('/api/en/site-settings');
      return response.data.data || null;
    } catch (error) {
      console.error('Fetch site settings error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchAllProducts(storeId: number = 1): Promise<any[]> {
    try {
      const allProducts: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      console.log(`🔄 Fetching all products from API for store_id: ${storeId}...`);

      while (hasMore) {
        const response = await this.fetchProducts({
          page: currentPage,
          perPage: 50,
          store_id: storeId,
          available_stock: true,
        });

        allProducts.push(...response.data);
        console.log(`📦 Fetched page ${currentPage}/${response.meta.last_page} - ${response.data.length} products`);

        if (currentPage >= response.meta.last_page) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      console.log(`✅ Total products fetched: ${allProducts.length}`);
      return allProducts;
    } catch (error) {
      console.error('Fetch all products error:', error);
      throw this.handleError(error);
    }
  }

  public async uploadOrder(orderPayload: any): Promise<any> {
    try {
      console.log('📤 Uploading order to API:', orderPayload.local_id);
      
      const response = await this.client.post('/api/pos/pos-product-order', orderPayload);
      
      console.log('✅ Order uploaded successfully:', response.data);
      
      return {
        success: true,
        remote_id: response.data.id || response.data.order_id,
        message: 'Order uploaded successfully',
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Upload order error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  public async fetchProductUpdates(_since: string, storeId: number = 2): Promise<any[]> {
    try {
      console.log('Fetching all products from API (no incremental update endpoint)');
      return await this.fetchAllProducts(storeId);
    } catch (error) {
      console.error('Fetch product updates error:', error);
      throw this.handleError(error);
    }
  }

  public async checkConnection(): Promise<boolean> {
    try {
      console.log('🔍 Checking connection to:', this.baseURL);
      
      // Try multiple endpoints to verify connection
      try {
        await this.client.get('/api/health', { timeout: 3000 });
        console.log('✅ Health endpoint responded');
        return true;
      } catch (healthError) {
        // If health endpoint fails, try login endpoint (just to check connectivity)
        try {
          await this.client.get('/api/login', { timeout: 3000 });
          console.log('✅ API endpoint accessible');
          return true;
        } catch (loginError) {
          console.error('❌ No API endpoints responding');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      return false;
    }
  }

  public async createCustomer(customer: { name: string; phone?: string; email?: string; address?: string }): Promise<any> {
    try {
      const response = await this.client.post<any>('/api/pos/pos-create-customers', customer);
      return response.data;
    } catch (error) {
      console.error('Create customer API error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchExpenseTypes(): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/pos/pos-expense-types');
      return response.data;
    } catch (error) {
      console.error('Fetch expense types API error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchExpenses(params?: any): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/pos/pos-expenses', { params });
      return response.data;
    } catch (error) {
      console.error('Fetch expenses API error:', error);
      throw this.handleError(error);
    }
  }

  public async createExpense(data: {
    expense_account: string;
    amount: number;
    expense_date: string;
    description?: string;
    is_petty_cash?: boolean;
    store_id?: number;
  }): Promise<any> {
    try {
      const response = await this.client.post<any>('/api/pos/pos-expenses', data);
      return response.data;
    } catch (error) {
      console.error('Create expense API error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchPurchases(params?: any): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/pos/pos-purchases', { params });
      return response.data;
    } catch (error) {
      console.error('Fetch purchases API error:', error);
      throw this.handleError(error);
    }
  }

  public async fetchRecentSales(storeId: number | string = 'all'): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/pos/pos-recent-sales', {
        params: { store_id: storeId }
      });
      return response.data;
    } catch (error) {
      console.error('Fetch recent sales API error:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

// Singleton instance
let apiService: ApiService | null = null;

export function getApiService(): ApiService {
  if (!apiService) {
    // Load base URL from settings, fallback to environment variable
    const envBaseURL = process.env.API_BASE_URL;
    const defaultBaseURL = envBaseURL || '';
    
    console.log('[ApiService] Environment API_BASE_URL:', envBaseURL);
    console.log('[ApiService] Default fallback:', defaultBaseURL);
    
    try {
      const { getDatabaseService } = require('../database');
      const db = getDatabaseService().getDatabase();
      const settings = db.prepare('SELECT api_base_url FROM app_settings WHERE id = 1').get() as any;
      const baseURL = settings?.api_base_url || defaultBaseURL;
      console.log('[ApiService] Settings api_base_url:', settings?.api_base_url);
      console.log('[ApiService] Final base URL:', baseURL);
      apiService = new ApiService(baseURL);
    } catch (error) {
      console.warn('[ApiService] Could not load base URL from settings, using environment default:', defaultBaseURL);
      apiService = new ApiService(defaultBaseURL);
    }
  }
  return apiService;
}

export function resetApiService(): void {
  apiService = null;
}
