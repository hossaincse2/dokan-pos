import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LoginCredentials, LoginResponse } from '@shared/types';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Load initial state from localStorage if available
const loadInitialState = (): AuthState => {
  try {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      const parsed = JSON.parse(savedAuth);
      console.log('[AuthSlice] Loaded saved auth state:', parsed);
      return {
        user: parsed.user || null,
        isAuthenticated: parsed.isAuthenticated || false,
        loading: false,
        error: null,
      };
    }
  } catch (error) {
    console.error('[AuthSlice] Failed to load saved auth:', error);
  }
  
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const initialState: AuthState = loadInitialState();

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('[AuthSlice] Calling API login...');
      const response: LoginResponse = await window.electronAPI.login(credentials);
      console.log('[AuthSlice] API login response:', response);
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Login failed');
      }
      
      return response;
    } catch (error: any) {
      console.error('[AuthSlice] Login error:', error);
      const errorMessage = error.message || error.toString() || 'Login failed. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await window.electronAPI.logout();
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const response = await window.electronAPI.checkAuth();
  return response;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        console.log('[AuthSlice] Login pending...');
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        console.log('[AuthSlice] Login fulfilled! Setting isAuthenticated = true', action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
        
        // Persist to localStorage
        try {
          localStorage.setItem('auth', JSON.stringify({
            isAuthenticated: true,
            user: action.payload.user,
            offline_mode: action.payload.offline_mode || false,
          }));
          console.log('[AuthSlice] Auth state saved to localStorage');
          
          if (action.payload.offline_mode) {
            console.log('[AuthSlice] ⚠️ Logged in OFFLINE MODE');
          }
        } catch (error) {
          console.error('[AuthSlice] Failed to save auth to localStorage:', error);
        }
        
        console.log('[AuthSlice] State after login:', { isAuthenticated: state.isAuthenticated, user: state.user });
      })
      .addCase(login.rejected, (state, action) => {
        console.log('[AuthSlice] Login rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        console.log('[AuthSlice] Logout fulfilled');
        state.user = null;
        state.isAuthenticated = false;
        
        // Clear from localStorage
        try {
          localStorage.removeItem('auth');
          console.log('[AuthSlice] Auth state cleared from localStorage');
        } catch (error) {
          console.error('[AuthSlice] Failed to clear auth from localStorage:', error);
        }
      })
      // Check auth
      .addCase(checkAuth.pending, (state) => {
        console.log('[AuthSlice] Check auth pending...');
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        console.log('[AuthSlice] Check auth fulfilled:', action.payload);
        state.loading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user = action.payload.user;
        
        // Persist to localStorage
        if (action.payload.isAuthenticated) {
          try {
            localStorage.setItem('auth', JSON.stringify({
              isAuthenticated: true,
              user: action.payload.user,
            }));
            console.log('[AuthSlice] Auth state saved to localStorage from checkAuth');
          } catch (error) {
            console.error('[AuthSlice] Failed to save auth to localStorage:', error);
          }
        }
      })
      .addCase(checkAuth.rejected, (state) => {
        console.log('[AuthSlice] Check auth rejected');
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
