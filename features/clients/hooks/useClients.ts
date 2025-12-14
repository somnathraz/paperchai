
import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    setFilters,
    toggleRowExpansion,
    setActiveClient,
    setClientProjects,
    ClientListItem,
    ClientsState
} from "../store/clientsSlice";
import { CreateClientPayload, UpdateClientPayload } from "@/lib/api/services";

export const useClients = () => {
    const dispatch = useAppDispatch();
    const { list, activeClient, clientProjects, isLoading, error, filters, expandedRows, isInitialized } = useAppSelector((state) => state.clients);

    // Initial fetch if not initialized
    useEffect(() => {
        if (!isInitialized && !isLoading) {
            dispatch(fetchClients());
        }
    }, [dispatch, isInitialized, isLoading]);

    // Derived State: Filtered and Sorted List
    const filteredClients = useMemo(() => {
        let result = [...list];

        // Filter by Query
        if (filters.query) {
            const q = filters.query.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.company && c.company.toLowerCase().includes(q))
            );
        }

        // Filter by Reliability
        if (filters.reliability !== 'all') {
            result = result.filter(c => {
                if (filters.reliability === "reliable") return c.reliabilityScore >= 80;
                if (filters.reliability === "sometimes") return c.reliabilityScore >= 60 && c.reliabilityScore < 80;
                if (filters.reliability === "high-risk") return c.reliabilityScore < 60;
                return true;
            });
        }

        // Sort
        result.sort((a, b) => {
            let aVal: any = a[filters.sortField as keyof ClientListItem];
            let bVal: any = b[filters.sortField as keyof ClientListItem];

            // Handle special sort fields
            if (filters.sortField === 'score') {
                aVal = a.reliabilityScore;
                bVal = b.reliabilityScore;
            } else if (filters.sortField === 'delay') {
                aVal = a.averageDelayDays;
                bVal = b.averageDelayDays;
            } else if (filters.sortField === 'outstanding') {
                aVal = Number(a.outstanding || 0);
                bVal = Number(b.outstanding || 0);
            } else if (filters.sortField === 'name') {
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
            }

            if (aVal < bVal) return filters.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return filters.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [list, filters]);

    return {
        // State
        clients: filteredClients, // The filtered list for the UI
        allClients: list, // Raw list if needed
        activeClient,
        clientProjects,
        isLoading,
        error,
        filters,
        expandedRows,

        // Actions
        refreshClients: () => dispatch(fetchClients()),
        addClient: (payload: CreateClientPayload) => dispatch(createClient(payload)),
        editClient: (id: string, data: UpdateClientPayload) => dispatch(updateClient({ id, data })),
        removeClient: (id: string) => dispatch(deleteClient(id)),

        // UI Actions
        setSearchQuery: (query: string) => dispatch(setFilters({ query })),
        setReliabilityFilter: (reliability: string) => dispatch(setFilters({ reliability })),
        setSort: (field: any, direction: "asc" | "desc") => dispatch(setFilters({ sortField: field, sortDirection: direction })),
        toggleRow: (id: string) => dispatch(toggleRowExpansion(id)),
        selectClient: (client: any | null) => dispatch(setActiveClient(client)), // Ideally fetch details here too if needed
    };
};
