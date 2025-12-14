"use client";

import { createContext, useContext, useReducer, useMemo, useCallback } from "react";

// Types
export type IntegrationStatus = {
    connected: boolean;
    status: string;
    workspaceName?: string;
    lastError?: string;
    lastSync?: string;
};

export type StatusResponse = {
    success: boolean;
    tier: string;
    integrationsEnabled: boolean;
    limits: {
        maxConnections: number;
        importsPerDay: number;
        importsPerMinute: number;
    };
    usage: {
        connectionsUsed: number;
        importsToday: number;
    };
    integrations: {
        slack: IntegrationStatus;
        notion: IntegrationStatus;
    };
};

type IntegrationState = {
    status: StatusResponse | null;
    loading: boolean;
    error: string | null;
    activeTab: "connections" | "automation" | "activity";
};

type IntegrationAction =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_STATUS"; payload: StatusResponse }
    | { type: "SET_ERROR"; payload: string | null }
    | { type: "SET_TAB"; payload: IntegrationState["activeTab"] }
    | { type: "CLEAR_ERROR" };

// Reducer
function integrationReducer(state: IntegrationState, action: IntegrationAction): IntegrationState {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "SET_STATUS":
            return { ...state, status: action.payload, loading: false, error: null };
        case "SET_ERROR":
            return { ...state, error: action.payload, loading: false };
        case "SET_TAB":
            return { ...state, activeTab: action.payload };
        case "CLEAR_ERROR":
            return { ...state, error: null };
        default:
            return state;
    }
}

// Initial state
const initialState: IntegrationState = {
    status: null,
    loading: true,
    error: null,
    activeTab: "connections",
};

// Context
const IntegrationContext = createContext<{
    state: IntegrationState;
    dispatch: React.Dispatch<IntegrationAction>;
    fetchStatus: () => Promise<void>;
    setTab: (tab: IntegrationState["activeTab"]) => void;
} | null>(null);

// Provider
export function IntegrationProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(integrationReducer, initialState);

    const fetchStatus = useCallback(async () => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
            const response = await fetch("/api/integrations/status");
            const data = await response.json();
            if (data.success) {
                dispatch({ type: "SET_STATUS", payload: data });
            } else {
                dispatch({ type: "SET_ERROR", payload: data.error || "Failed to load status" });
            }
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: "Failed to load integration status" });
        }
    }, []);

    const setTab = useCallback((tab: IntegrationState["activeTab"]) => {
        dispatch({ type: "SET_TAB", payload: tab });
    }, []);

    const value = useMemo(
        () => ({
            state,
            dispatch,
            fetchStatus,
            setTab,
        }),
        [state, fetchStatus, setTab]
    );

    return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
}

// Hook
export function useIntegration() {
    const context = useContext(IntegrationContext);
    if (!context) {
        throw new Error("useIntegration must be used within IntegrationProvider");
    }
    return context;
}

// Selectors (memoized)
export function useIntegrationStatus() {
    const { state } = useIntegration();
    return useMemo(() => state.status, [state.status]);
}

export function useIntegrationLoading() {
    const { state } = useIntegration();
    return state.loading;
}

export function useIntegrationError() {
    const { state } = useIntegration();
    return state.error;
}

export function useActiveTab() {
    const { state } = useIntegration();
    return state.activeTab;
}

export function useIsConnected(provider: "slack" | "notion") {
    const status = useIntegrationStatus();
    return useMemo(() => status?.integrations?.[provider]?.connected ?? false, [status, provider]);
}

export function useIsPremium() {
    const status = useIntegrationStatus();
    return useMemo(() => status?.integrationsEnabled ?? false, [status]);
}
