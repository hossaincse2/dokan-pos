import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AppSettings } from '@shared/types';

interface SettingsState {
  settings: AppSettings | null;
  siteSettings: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  siteSettings: null,
  loading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async () => {
    const settings = await window.electronAPI.getSettings();
    return settings;
  }
);

export const fetchSiteSettings = createAsyncThunk(
  'settings/fetchSiteSettings',
  async () => {
    const siteSettings = await window.electronAPI.getSiteSettings();
    return siteSettings;
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: Partial<AppSettings>) => {
    await window.electronAPI.updateSettings(settings);
    return settings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      // Fetch site settings
      .addCase(fetchSiteSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSiteSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.siteSettings = action.payload;
      })
      .addCase(fetchSiteSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch site settings';
      })
      // Update settings
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        if (state.settings) {
          Object.assign(state.settings, action.payload);
        }
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update settings';
      });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
