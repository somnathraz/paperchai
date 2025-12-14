/**
 * Editor Slice - Invoice editor state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { invoiceService } from "@/lib/api/services";

export interface EditorState {
    formState: any; // Invoice form data
    sections: any[]; // Invoice sections
    currentTemplate: string | null;
    savedInvoiceId: string | null;
    invoiceStatus: "draft" | "sent" | "scheduled" | null;
    lastSentAt: string | null;
    status: "idle" | "loading" | "saving" | "failed" | "succeeded";
    error: string | null;
}

const initialState: EditorState = {
    formState: {},
    sections: [],
    currentTemplate: null,
    savedInvoiceId: null,
    invoiceStatus: null,
    lastSentAt: null,
    status: "idle",
    error: null,
};

// Async Thunks
export const saveInvoice = createAsyncThunk(
    "editor/saveInvoice",
    async (payload: any, { rejectWithValue }) => {
        try {
            const result = await invoiceService.save(payload);
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to save invoice");
        }
    }
);

export const sendInvoice = createAsyncThunk(
    "editor/sendInvoice",
    async (payload: { invoiceId: string; channel: "email" | "whatsapp" | "both" }, { rejectWithValue }) => {
        try {
            const result = await invoiceService.send(payload);
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return result.data;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to send invoice");
        }
    }
);

const editorSlice = createSlice({
    name: "editor",
    initialState,
    reducers: {
        setFormState(state, action: PayloadAction<any>) {
            state.formState = action.payload;
        },
        setSections(state, action: PayloadAction<any[]>) {
            state.sections = action.payload;
        },
        setCurrentTemplate(state, action: PayloadAction<string>) {
            state.currentTemplate = action.payload;
        },
        resetEditor(state) {
            return initialState;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Save invoice
        builder
            .addCase(saveInvoice.pending, (state) => {
                state.status = "saving";
                state.error = null;
            })
            .addCase(saveInvoice.fulfilled, (state, action) => {
                state.status = "succeeded";
                if (action.payload && typeof action.payload === 'object' && 'id' in action.payload) {
                    state.savedInvoiceId = (action.payload as any).id || null;
                }
            })
            .addCase(saveInvoice.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload as string;
            });

        // Send invoice
        builder
            .addCase(sendInvoice.pending, (state) => {
                state.status = "loading";
            })
            .addCase(sendInvoice.fulfilled, (state) => {
                state.status = "succeeded";
                state.invoiceStatus = "sent";
                state.lastSentAt = new Date().toISOString();
            })
            .addCase(sendInvoice.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload as string;
            });
    },
});

export const { setFormState, setSections, setCurrentTemplate, resetEditor, clearError } = editorSlice.actions;

export default editorSlice.reducer;
