import { getDatabaseService } from '../database';
import axios from 'axios';

export interface LoginCredentials {
  email_username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  expired_at: string;
  user: {
    name: string;
    email: string;
    username: string;
    retailer_role_yn: string;
  };
}

export interface StoredAuth {
  id: number;
  token: string;
  user_id: number;
  user_name: string;
  user_email: string;
  username: string;
  retailer_role_yn: string;
  expired_at: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  private baseURL: string;

  constructor(baseURL: string = process.env.API_BASE_URL || '') {
    this.baseURL = baseURL;
  }

  /**
   * Check if user is authenticated by checking local database
   * This is the FIRST check - no server call
   */
  public isAuthenticated(): boolean {
    const auth = this.getLocalAuth();
    if (!auth) return false;

    // Check if token is expired
    const expiryDate = new Date(auth.expired_at);
    const now = new Date();

    return now < expiryDate;
  }

  /**
   * Get authentication data from local database
   */
  public getLocalAuth(): StoredAuth | null {
    try {
      const db = getDatabaseService().getDatabase();
      const auth = db.prepare(`
        SELECT * FROM auth_tokens ORDER BY id DESC LIMIT 1
      `).get() as StoredAuth | undefined;

      return auth || null;
    } catch (error) {
      console.error('Error getting local auth:', error);
      return null;
    }
  }

  /**
   * Get stored token for API calls
   */
  public getToken(): string | null {
    const auth = this.getLocalAuth();
    return auth?.token || null;
  }

  /**
   * Get stored user info
   */
  public getUser(): any {
    const auth = this.getLocalAuth();
    if (!auth) return null;

    return {
      id: auth.user_id,
      name: auth.user_name,
      email: auth.user_email,
      username: auth.username,
      retailer_role_yn: auth.retailer_role_yn,
    };
  }

  /**
   * Login - Only called when token is missing or expired
   * Saves token to local database
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${this.baseURL}/api/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (response.data.success && response.data.token) {
        // Save to local database
        this.saveAuthToLocal(response.data);
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  /**
   * Save authentication data to local database
   */
  private saveAuthToLocal(loginResponse: LoginResponse): void {
    try {
      const db = getDatabaseService().getDatabase();

      // Clear old tokens
      db.prepare('DELETE FROM auth_tokens').run();

      // Insert new token
      db.prepare(`
        INSERT INTO auth_tokens (
          token, user_id, user_name, user_email, username, 
          retailer_role_yn, expired_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        loginResponse.token,
        1, // We don't have user_id from API, using 1
        loginResponse.user.name,
        loginResponse.user.email,
        loginResponse.user.username,
        loginResponse.user.retailer_role_yn,
        loginResponse.expired_at,
        new Date().toISOString()
      );

      console.log('✅ Auth token saved to local database');
    } catch (error) {
      console.error('Error saving auth to local:', error);
      throw error;
    }
  }

  /**
   * Logout - Clear local authentication
   */
  public logout(): void {
    try {
      const db = getDatabaseService().getDatabase();
      db.prepare('DELETE FROM auth_tokens').run();
      console.log('✅ Logged out - token cleared from local database');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Refresh token if needed (optional)
   */
  public async refreshTokenIfNeeded(): Promise<boolean> {
    const auth = this.getLocalAuth();
    if (!auth) return false;

    const expiryDate = new Date(auth.expired_at);
    const now = new Date();
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // If token expires in less than 2 days, consider refreshing
    if (daysUntilExpiry < 2 && daysUntilExpiry > 0) {
      console.log('⚠️ Token expiring soon, consider refreshing');
      // Implement refresh logic here if your API supports it
      return false;
    }

    return true;
  }
}

// Singleton instance
let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}
