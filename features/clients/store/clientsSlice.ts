
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { clientService, CreateClientPayload, UpdateClientPayload } from "@/lib/api/services";

export interface ClientListItem {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
    reliabilityScore: number;
    averageDelayDays: number;
    outstanding: any;
    updatedAt: string; // ISO Serialized
    projectsCount: number;
    invoicesCount: number;
    tags?: string | null;
}

export interface ClientsState {
    list: ClientListItem[];
    activeClient: any | null; // Detailed client
    clientProjects: Record<string, any[]>; // Projects by client ID
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;

    // UI State
    filters: {
        query: string;
        reliability: string; // 'all' | 'reliable' | 'sometimes' | 'high-risk'
        sortField: "name" | "outstanding" | "score" | "delay";
        sortDirection: "asc" | "desc";
    };
    expandedRows: string[];
}

const initialState: ClientsState = {
    list: [],
    activeClient: null,
    clientProjects: {},
    isLoading: false,
    error: null,
    isInitialized: false,
    filters: {
        query: "",
        reliability: "all",
        sortField: "name",
        sortDirection: "asc",
    },
    expandedRows: [],
};

// Async Thunks
export const fetchClients = createAsyncThunk(
    "clients/fetchClients",
    async (_, { rejectWithValue }) => {
        try {
            const response = await clientService.getAll();
            if (response.error) {
                return rejectWithValue(response.error);
            }
            return (response.data as any).clients;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch clients");
        }
    }
);

export const createClient = createAsyncThunk(
    "clients/createClient",
    async (payload: CreateClientPayload, { rejectWithValue }) => {
        try {
            const response = await clientService.create(payload);
            if (response.error) {
                return rejectWithValue(response.error);
            }
            return (response.data as any).client;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to create client");
        }
    }
);

export const updateClient = createAsyncThunk(
    "clients/updateClient",
    async ({ id, data }: { id: string; data: UpdateClientPayload }, { rejectWithValue }) => {
        try {
            const response = await clientService.update(id, data);
            if (response.error) {
                return rejectWithValue(response.error);
            }
            return (response.data as any).client;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to update client");
        }
    }
);

export const deleteClient = createAsyncThunk(
    "clients/deleteClient",
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await clientService.delete(id);
            if (response.error) {
                return rejectWithValue(response.error);
            }
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to delete client");
        }
    }
);

/* 
 * Note: Fetching client projects is done via a separate API call usually. 
 * Since the API structure for fetching projects per client isn't fully standardized in the service yet, 
 * we might need to rely on the generic fetch logic or create a service method.
 * Assuming for now we use the direct API call in the thunk or service.
 */

// Slice
const clientsSlice = createSlice({
    name: "clients",
    initialState,
    reducers: {
        setFilters(state, action: PayloadAction<Partial<ClientsState["filters"]>>) {
            state.filters = { ...state.filters, ...action.payload };
        },
        toggleRowExpansion(state, action: PayloadAction<string>) {
            const clientId = action.payload;
            const index = state.expandedRows.indexOf(clientId);
            if (index === -1) {
                state.expandedRows.push(clientId);
            } else {
                state.expandedRows.splice(index, 1);
            }
        },
        setActiveClient(state, action: PayloadAction<any>) {
            state.activeClient = action.payload;
        },
        setClientProjects(state, action: PayloadAction<{ clientId: string, projects: any[] }>) {
            state.clientProjects[action.payload.clientId] = action.payload.projects;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClients.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchClients.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isInitialized = true;
                state.list = action.payload;
            })
            .addCase(fetchClients.rejected, (state, action) => {
                state.isLoading = false;
                state.isInitialized = true;
                state.error = action.payload as string;
            })
            .addCase(createClient.fulfilled, (state, action) => {
                state.list.unshift(action.payload); // Add new client to start
            })
            .addCase(updateClient.fulfilled, (state, action) => {
                const index = state.list.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = { ...state.list[index], ...action.payload };
                }
                if (state.activeClient?.id === action.payload.id) {
                    state.activeClient = action.payload;
                }
            })
            .addCase(deleteClient.fulfilled, (state, action) => {
                state.list = state.list.filter(c => c.id !== action.payload);
            });
    },
});

export const { setFilters, toggleRowExpansion, setActiveClient, setClientProjects } = clientsSlice.actions;

export default clientsSlice.reducer;
