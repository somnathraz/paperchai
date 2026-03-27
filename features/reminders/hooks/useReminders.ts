/**
 * useReminders Hook
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  setActiveTab,
  clearError,
  setFilters,
  resetFilters,
  fetchRemindersData,
  sendReminder,
} from "../store/reminderSlice";

export const useReminders = () => {
  const dispatch = useAppDispatch();
  const { queue, upcoming, failures, filters, health, activeTab, isLoading, error, isInitialized } =
    useAppSelector((state) => state.reminders);

  // Initial fetch if not initialized
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      dispatch(fetchRemindersData());
    }
  }, [dispatch, isInitialized, isLoading]);

  const filteredQueue = queue.filter((item: any) => {
    const statusMatch =
      filters.statuses.length === 0 || filters.statuses.includes((item.status || "").toLowerCase());
    const clientMatch =
      filters.clients.length === 0 || filters.clients.includes((item.client || "").toLowerCase());
    const channelMatch =
      filters.channels.length === 0 ||
      filters.channels.includes((item.channel || "").toLowerCase());
    return statusMatch && clientMatch && channelMatch;
  });

  const filteredFailures = failures.filter((item: any) => {
    const statusMatch =
      filters.statuses.length === 0 ||
      filters.statuses.includes((item.status || "failed").toLowerCase());
    const clientMatch =
      filters.clients.length === 0 || filters.clients.includes((item.client || "").toLowerCase());
    return statusMatch && clientMatch;
  });

  return {
    // State
    queue,
    filteredQueue,
    upcoming,
    failures,
    filteredFailures,
    filters,
    health,
    activeTab,
    isLoading,
    error,

    // Actions
    refreshData: () => dispatch(fetchRemindersData()),
    setTab: (tab: string) => dispatch(setActiveTab(tab)),
    setFilters: (next: { statuses?: string[]; clients?: string[]; channels?: string[] }) =>
      dispatch(setFilters(next)),
    resetFilters: () => dispatch(resetFilters()),
    clearError: () => dispatch(clearError()),
    sendReminder: (invoiceId: string, channel: string) =>
      dispatch(sendReminder({ invoiceId, channel })).unwrap(),
  };
};
