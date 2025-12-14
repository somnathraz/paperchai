"use client";

import { useState, useEffect, useCallback } from "react";

export type UserSettings = {
    defaultTaxRate: number | null;
    taxInclusive: boolean;
    defaultCurrency: string;
    paymentTerms: string | null;
    defaultNotes: string | null;
    defaultTerms: string | null;
    defaultTemplate: string | null;
};

export type SavedItem = {
    id: string;
    title: string;
    description: string | null;
    rate: number;
    unit: string | null;
    taxRate: number | null;
    hsnCode: string | null;
    category: string | null;
    usageCount: number;
    lastUsedAt: string | null;
};

const DEFAULT_SETTINGS: UserSettings = {
    defaultTaxRate: 18,
    taxInclusive: false,
    defaultCurrency: "INR",
    paymentTerms: "Net 30",
    defaultNotes: null,
    defaultTerms: null,
    defaultTemplate: null,
};

export function useUserSettings() {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/user/settings");
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings || DEFAULT_SETTINGS);
            }
        } catch (err) {
            setError("Failed to fetch settings");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
        try {
            const res = await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to update settings:", err);
            return false;
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, error, updateSettings, refetch: fetchSettings };
}

export function useSavedItems() {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async (search?: string, limit?: number) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (limit) params.set("limit", String(limit));

            const res = await fetch(`/api/items?${params}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (err) {
            setError("Failed to fetch items");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveItem = useCallback(async (item: Omit<SavedItem, "id" | "usageCount" | "lastUsedAt">) => {
        try {
            const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
            });
            if (res.ok) {
                const data = await res.json();
                setItems(prev => [data.item, ...prev]);
                return data.item;
            }
            return null;
        } catch (err) {
            console.error("Failed to save item:", err);
            return null;
        }
    }, []);

    const deleteItem = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
            if (res.ok) {
                setItems(prev => prev.filter(item => item.id !== id));
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to delete item:", err);
            return false;
        }
    }, []);

    const trackUsage = useCallback(async (id: string) => {
        try {
            await fetch(`/api/items/${id}/use`, { method: "POST" });
        } catch (err) {
            console.error("Failed to track usage:", err);
        }
    }, []);

    useEffect(() => {
        fetchItems(undefined, 10); // Fetch top 10 frequently used
    }, [fetchItems]);

    return { items, loading, error, fetchItems, saveItem, deleteItem, trackUsage };
}
