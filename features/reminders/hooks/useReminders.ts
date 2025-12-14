
/**
 * useReminders Hook
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    setActiveTab,
    clearError,
    fetchRemindersData,
    sendReminder
} from "../store/reminderSlice";

export const useReminders = () => {
    const dispatch = useAppDispatch();
    const { queue, upcoming, failures, health, activeTab, isLoading, error, isInitialized } = useAppSelector((state) => state.reminders);

    // Initial fetch if not initialized
    useEffect(() => {
        if (!isInitialized && !isLoading) {
            dispatch(fetchRemindersData());
        }
    }, [dispatch, isInitialized, isLoading]);

    return {
        // State
        queue,
        upcoming,
        failures,
        health,
        activeTab,
        isLoading,
        error,

        // Actions
        refreshData: () => dispatch(fetchRemindersData()),
        setTab: (tab: string) => dispatch(setActiveTab(tab)),
        clearError: () => dispatch(clearError()),
        sendReminder: (invoiceId: string, channel: string) => dispatch(sendReminder({ invoiceId, channel })),
    };
};
