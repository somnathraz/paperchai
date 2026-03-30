/**
 * useDashboard Hook - Access dashboard state and actions
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    fetchDashboardStats,
    fetchRecentActivity,
    fetchCashflow,
    fetchRecentInvoices,
    setActiveTab,
    clearError,
} from "../store/dashboardSlice";

export const useDashboard = () => {
    const dispatch = useAppDispatch();
    const dashboard = useAppSelector((state) => state.dashboard);

    // Auto-fetch on mount
    useEffect(() => {
        dispatch(fetchDashboardStats());
        dispatch(fetchRecentActivity());
        dispatch(fetchCashflow());
        dispatch(fetchRecentInvoices());
    }, [dispatch]);

    return {
        // State
        stats: dashboard.stats,
        recentActivity: dashboard.recentActivity,
        cashflow: dashboard.cashflow,
        recentInvoices: dashboard.recentInvoices,
        activeTab: dashboard.activeTab,
        isLoading: dashboard.isLoading,
        error: dashboard.error,

        // Actions
        setTab: (tab: string) => dispatch(setActiveTab(tab)),
        refreshStats: () => dispatch(fetchDashboardStats()),
        refreshActivity: () => dispatch(fetchRecentActivity()),
        refreshCashflow: () => dispatch(fetchCashflow()),
        refreshInvoices: () => dispatch(fetchRecentInvoices()),
        clearError: () => dispatch(clearError()),
    };
};
