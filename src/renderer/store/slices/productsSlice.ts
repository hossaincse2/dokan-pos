import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '@shared/types';

interface ProductsState {
  items: Product[];
  searchResults: Product[];
  loading: boolean;
  searchLoading: boolean;
  error: string | null;
  currentPage: number;
  lastPage: number;
  total: number;
}

const initialState: ProductsState = {
  items: [],
  searchResults: [],
  loading: false,
  searchLoading: false,
  error: null,
  currentPage: 1,
  lastPage: 1,
  total: 0,
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: { page?: number; perPage?: number; storeId?: number; categoryId?: number | null; billedBy?: number } = {}) => {
    const response = await window.electronAPI.getProducts(params);
    return response;
  }
);

export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (params: { searchTerm: string; storeId?: number }) => {
    const response = await window.electronAPI.searchProducts(params);
    return response;
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearSearch: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.currentPage = action.payload.meta.current_page;
        state.lastPage = action.payload.meta.last_page;
        state.total = action.payload.meta.total;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch products';
      })
      // Search products
      .addCase(searchProducts.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.error.message || 'Search failed';
      });
  },
});

export const { clearSearch, clearError } = productsSlice.actions;
export default productsSlice.reducer;
