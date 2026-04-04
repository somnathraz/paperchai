/**
 * useAutomation Hook
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setActiveTab, clearError, fetchAutomationData } from "../store/automationSlice";

export const useAutomation = () => {
  const dispatch = useAppDispatch();
  const { stats, integrationStatus, activeTab, isLoading, error, hasFetched } = useAppSelector(
    (state) => state.automation
  );

  // Initial fetch — guard with hasFetched to prevent re-firing when stats is null after a failed fetch
  useEffect(() => {
    if (!hasFetched && !isLoading) {
      dispatch(fetchAutomationData());
    }
  }, [dispatch, hasFetched, isLoading]);

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
