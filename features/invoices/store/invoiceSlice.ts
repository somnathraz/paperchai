/**
 * Invoice Slice - Redux state management for invoice list and filters
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { invoiceService } from "@/lib/api/services";

export interface Invoice {
    id: string;
    number: string;
    clientId?: string;
    projectId?: string;
    status: string;
    total: number;
    currency: string;
    dueDate?: string;
    createdAt: string;
}

export interface InvoiceFilters {
    status?: string;
    clientId?: string;
    projectId?: string;
    search?: string;
}

export interface InvoiceState {
    invoices: Invoice[];
    filters: InvoiceFilters;
    selectedInvoice: Invoice | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: InvoiceState = {
    invoices: [],
    filters: {},
    selectedInvoice: null,
    isLoading: false,
    error: null,
};

// Async Thunks
export const fetchInvoices = createAsyncThunk(
    "invoices/fetchAll",
    async (filters: InvoiceFilters = {}, { rejectWithValue }) => {
        try {
            const result = await invoiceService.getAll();
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch invoices");
        }
    }
);

const invoiceSlice = createSlice({
    name: "invoices",
    initialState,
    reducers: {
        setFilters(state, action: PayloadAction<InvoiceFilters>) {
            state.filters = action.payload;
        },
        clearFilters(state) {
            state.filters = {};
        },
        setSelectedInvoice(state, action: PayloadAction<Invoice | null>) {
            state.selectedInvoice = action.payload;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchInvoices.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchInvoices.fulfilled, (state, action) => {
                state.isLoading = false;
                state.invoices = (action.payload || []) as Invoice[];
            })
            .addCase(fetchInvoices.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setFilters, clearFilters, setSelectedInvoice, clearError } = invoiceSlice.actions;

export default invoiceSlice.reducer;
