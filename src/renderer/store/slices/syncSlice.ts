import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SyncStatus, SyncResult } from '@shared/types';

interface SyncState extends SyncStatus {
  history: any[];
  lastResult: SyncResult | null;
}

const initialState: SyncState = {
  isRunning: false,
  lastSyncAt: null,
  queueCount: 0,
  progress: 0,
  currentAction: undefined,
  error: null,
  history: [],
  lastResult: null,
};

export const startSync = createAsyncThunk(
  'sync/startSync',
  async (dryRun: boolean = false) => {
    const result = await window.electronAPI.startSync(dryRun);
    return result;
  }
);

export const fetchSyncStatus = createAsyncThunk(
  'sync/fetchStatus',
  async () => {
    const status = await window.electronAPI.getSyncStatus();
    return status;
  }
);

export const fetchSyncHistory = createAsyncThunk(
  'sync/fetchHistory',
  async (limit: number = 20) => {
    const history = await window.electronAPI.getSyncHistory(limit);
    return history;
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    updateProgress: (state, action) => {
      state.currentAction = action.payload.message;
      state.progress = action.payload.progress;
    },
    updateStatus: (state, action) => {
      Object.assign(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Start sync
      .addCase(startSync.pending, (state) => {
        state.isRunning = true;
        state.error = null;
        state.progress = 0;
      })
      .addCase(startSync.fulfilled, (state, action) => {
        state.isRunning = false;
        state.lastResult = action.payload;
        state.lastSyncAt = action.payload.timestamp;
        state.progress = 100;
        if (!action.payload.success) {
          state.error = action.payload.errors.join(', ');
        }
      })
      .addCase(startSync.rejected, (state, action) => {
        state.isRunning = false;
        state.error = action.error.message || 'Sync failed';
      })
      // Fetch status
      .addCase(fetchSyncStatus.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      })
      // Fetch history
      .addCase(fetchSyncHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  },
});

export const { updateProgress, updateStatus } = syncSlice.actions;
export default syncSlice.reducer;
