/**
 * useInvoices Hook - Access invoice list state and actions
 */

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    fetchInvoices,
    setFilters,
    clearFilters,
    setSelectedInvoice,
    clearError,
    InvoiceFilters,
} from "../store/invoiceSlice";

export const useInvoices = () => {
    const dispatch = useAppDispatch();
    const invoicesState = useAppSelector((state) => state.invoices);

    // Auto-fetch on mount
    useEffect(() => {
        dispatch(fetchInvoices({}));
    }, [dispatch]);

    return {
        // State
        invoices: invoicesState.invoices,
        filters: invoicesState.filters,
        selectedInvoice: invoicesState.selectedInvoice,
        isLoading: invoicesState.isLoading,
        error: invoicesState.error,

        // Actions
        setFilters: (filters: InvoiceFilters) => dispatch(setFilters(filters)),
        clearFilters: () => dispatch(clearFilters()),
        selectInvoice: (invoice: any) => dispatch(setSelectedInvoice(invoice)),
        refreshInvoices: () => dispatch(fetchInvoices(invoicesState.filters)),
        clearError: () => dispatch(clearError()),
    };
};
