
/**
 * useAutomation Hook
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    setActiveTab,
    clearError,
    fetchAutomationData
} from "../store/automationSlice";

export const useAutomation = () => {
    const dispatch = useAppDispatch();
    const { stats, integrationStatus, activeTab, isLoading, error } = useAppSelector((state) => state.automation);

    // Initial fetch
    useEffect(() => {
        if (!stats && !isLoading && !error) {
            dispatch(fetchAutomationData());
        }
    }, [dispatch, stats, isLoading, error]);

    return {
        // State
        stats,
        integrationStatus,
        activeTab,
        isLoading,
        error,

        // Actions
        refreshData: () => dispatch(fetchAutomationData()),
        setTab: (tab: string) => dispatch(setActiveTab(tab)),
        clearError: () => dispatch(clearError()),
    };
};
