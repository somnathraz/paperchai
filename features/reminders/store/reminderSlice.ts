
/**
 * Reminder Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { reminderService, RemindersDashboardData } from "@/lib/api/services/reminder.service";

export interface ReminderState {
  queue: any[];
  upcoming: any[];
  failures: any[]; // Add failures
  health: {
    deliveryRate: number;
    failedCount: number;
    openRate: number;
  } | null;
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: ReminderState = {
  queue: [],
  upcoming: [],
  failures: [], // Init failures
  health: null,
  activeTab: "queue",
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Thunks
export const fetchRemindersData = createAsyncThunk(
  "reminders/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const response = await reminderService.getDashboardData();
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data as RemindersDashboardData;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch reminders data");
    }
  }
);

export const sendReminder = createAsyncThunk(
  "reminders/send",
  async ({ invoiceId, channel }: { invoiceId: string; channel: string }, { rejectWithValue }) => {
    try {
      const response = await reminderService.sendReminder(invoiceId, channel);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { invoiceId, status: 'sent', channel };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to send reminder");
    }
  }
);

const reminderSlice = createSlice({
  name: "reminders",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    updateQueueItemStatus(state, action: PayloadAction<{ id: string, status: string }>) {
      const item = state.queue.find(i => i.invoiceId === action.payload.id);
      if (item) {
        item.status = action.payload.status;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Data
      .addCase(fetchRemindersData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRemindersData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.queue = action.payload.queue || [];
        state.upcoming = action.payload.upcoming || [];
        state.failures = action.payload.failures || [];
        state.health = action.payload.health || null;
      })
      .addCase(fetchRemindersData.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      })
      // Send Reminder (Optimistic Update)
      .addCase(sendReminder.fulfilled, (state, action) => {
        const item = state.queue.find(i => i.invoiceId === action.payload.invoiceId);
        if (item) {
          item.status = 'sent';
        }
      });
  }
});

export const { setActiveTab, clearError, updateQueueItemStatus } = reminderSlice.actions;
export default reminderSlice.reducer;
