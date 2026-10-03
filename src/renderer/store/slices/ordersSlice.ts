import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Order } from '@shared/types';

interface OrdersState {
  items: Order[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  lastPage: number;
  total: number;
}

const initialState: OrdersState = {
  items: [],
  loading: false,
  error: null,
  currentPage: 1,
  lastPage: 1,
  total: 0,
};

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: any) => {
    const response = await window.electronAPI.createOrder(orderData);
    return response;
  }
);

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: { page?: number; perPage?: number; status?: string; synced?: boolean } = {}) => {
    const response = await window.electronAPI.getOrders(params);
    return response;
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create order';
      })
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.currentPage = action.payload.meta.current_page;
        state.lastPage = action.payload.meta.last_page;
        state.total = action.payload.meta.total;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      });
  },
});

export const { clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
