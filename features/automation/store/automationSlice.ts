
/**
 * Automation Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { automationService, AutomationStats, IntegrationStatus } from "@/lib/api/services/automation.service";

export interface AutomationState {
  stats: AutomationStats | null;
  integrationStatus: IntegrationStatus | null;
  activeTab: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: AutomationState = {
  stats: null,
  integrationStatus: null,
  activeTab: "overview",
  isLoading: false,
  error: null,
};

// Thunks
export const fetchAutomationData = createAsyncThunk(
  "automation/fetchData",
  async (_, { rejectWithValue }) => {
    try {
      const [automationsRes, statusRes] = await Promise.all([
        automationService.getAutomations(),
        automationService.getIntegrationStatus()
      ]);

      if (!automationsRes.data || !statusRes.data) {
        return rejectWithValue("Failed to fetch data");
      }

      const error = !automationsRes.data.success ? (automationsRes.data as any).error : null;

      return {
        stats: automationsRes.data.success ? automationsRes.data.automations : null,
        integrationStatus: statusRes.data,
        error
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch automation data");
    }
  }
);

const automationSlice = createSlice({
  name: "automation",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAutomationData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAutomationData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload.stats || null;
        state.integrationStatus = action.payload.integrationStatus || null;
        if (action.payload.error) {
          state.error = action.payload.error as string;
        }
      })
      .addCase(fetchAutomationData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { setActiveTab, clearError } = automationSlice.actions;
export default automationSlice.reducer;
