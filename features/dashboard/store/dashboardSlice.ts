/**
 * Dashboard Slice - Redux state management for dashboard
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { dashboardService, DashboardStats, RecentActivity, CashflowData, RecentInvoice } from "@/lib/api/services";

export interface DashboardState {
    stats: DashboardStats | null;
    recentActivity: RecentActivity[];
    cashflow: CashflowData | null;
    recentInvoices: RecentInvoice[];
    activeTab: string;
    isLoading: boolean;
    error: string | null;
}

const initialState: DashboardState = {
    stats: null,
    recentActivity: [],
    cashflow: null,
    recentInvoices: [],
    activeTab: "overview",
    isLoading: false,
    error: null,
};

// Async Thunks
export const fetchDashboardStats = createAsyncThunk(
    "dashboard/fetchStats",
    async (_, { rejectWithValue }) => {
        try {
            const result = await dashboardService.getStats();
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch dashboard stats");
        }
    }
);

export const fetchRecentActivity = createAsyncThunk(
    "dashboard/fetchRecentActivity",
    async (_, { rejectWithValue }) => {
        try {
            const result = await dashboardService.getRecentActivity();
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch recent activity");
        }
    }
);

export const fetchCashflow = createAsyncThunk(
    "dashboard/fetchCashflow",
    async (_, { rejectWithValue }) => {
        try {
            const result = await dashboardService.getCashflow();
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch cashflow data");
        }
    }
);

export const fetchRecentInvoices = createAsyncThunk(
    "dashboard/fetchRecentInvoices",
    async (_, { rejectWithValue }) => {
        try {
            const result = await dashboardService.getRecentInvoices();
            if (result.error) {
                return rejectWithValue(result.error);
            }
            // The service returns { invoices: [...] } but thunk expects RecentInvoice[]
            return result.data?.invoices || [];
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch recent invoices");
        }
    }
);

const dashboardSlice = createSlice({
    name: "dashboard",
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
        // Fetch stats
        builder
            .addCase(fetchDashboardStats.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.stats = action.payload!;
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch recent activity
        builder
            .addCase(fetchRecentActivity.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRecentActivity.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recentActivity = action.payload!;
            })
            .addCase(fetchRecentActivity.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch cashflow
        builder
            .addCase(fetchCashflow.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchCashflow.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cashflow = action.payload!;
            })
            .addCase(fetchCashflow.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch recent invoices
        builder
            .addCase(fetchRecentInvoices.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRecentInvoices.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recentInvoices = action.payload!;
            })
            .addCase(fetchRecentInvoices.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setActiveTab, clearError } = dashboardSlice.actions;

export default dashboardSlice.reducer;
