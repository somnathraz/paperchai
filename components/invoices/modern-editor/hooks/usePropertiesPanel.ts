import { useState, useEffect, useCallback } from "react";
import type { SmartDefaultsResponse } from "@/app/api/smart-defaults/route";
import { InvoiceFormState } from "../../invoice-form";

// Type for billable items from project
export interface BillableItemsState {
    items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        currency: string;
        source: string;
    }>;
    nextMilestone: {
        id: string;
        title: string;
        amount: number;
        currency: string;
        status: string;
    } | null;
    loading: boolean;
}

// Type for recommendations
export interface Recommendation {
    field: string;
    label: string;
    value: any;
    displayValue: string;
    explanation: string;
    count?: number;
}

/**
 * Hook to manage smart defaults for invoice form
 * Fetches and applies intelligent defaults based on client/project history
 */
export function useSmartDefaults(
    formState: InvoiceFormState,
    onFormStateChange: (state: InvoiceFormState) => void
) {
    const [smartDefaults, setSmartDefaults] = useState<SmartDefaultsResponse | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [appliedDueDate, setAppliedDueDate] = useState(false);

    // Fetch smart defaults when client or project changes
    useEffect(() => {
        const fetchSmartDefaults = async () => {
            try {
                const params = new URLSearchParams();
                if (formState.clientId) params.set("clientId", formState.clientId);
                if (formState.projectId) params.set("projectId", formState.projectId);

                const res = await fetch(`/api/smart-defaults?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setSmartDefaults(data);
                    setDismissed(false);
                    setAppliedDueDate(false);
                }
            } catch (error) {
                console.error("Failed to fetch smart defaults:", error);
            }
        };

        fetchSmartDefaults();
    }, [formState.clientId, formState.projectId]);

    // Get client recommendations
    const getClientRecommendations = useCallback((): Recommendation[] => {
        if (!smartDefaults?.client) return [];

        const recs: Recommendation[] = [];
        const client = smartDefaults.client;

        if (client.currency && formState.currency !== client.currency.value) {
            recs.push({
                field: "currency",
                label: "Currency",
                value: client.currency.value,
                displayValue: client.currency.value,
                explanation: `Used ${client.currency.count} times with this client`,
                count: client.currency.count,
            });
        }

        if (client.reminderTone && formState.reminderTone !== client.reminderTone.value) {
            recs.push({
                field: "reminderTone",
                label: "Reminder Tone",
                value: client.reminderTone.value,
                displayValue: client.reminderTone.value,
                explanation: `Preferred tone for this client`,
                count: client.reminderTone.count,
            });
        }

        if (client.theme && client.theme.value) {
            recs.push({
                field: "theme",
                label: "Template",
                value: client.theme.value,
                displayValue: client.theme.value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                explanation: `Last used theme`,
                count: client.theme.count,
            });
        }

        // Full branding preset recommendation
        if (client.branding && (client.branding.primaryColor || client.branding.fontFamily)) {
            const b = client.branding;
            const isMatch =
                (!b.fontFamily || b.fontFamily === formState.fontFamily) &&
                (!b.primaryColor || b.primaryColor?.toLowerCase() === formState.primaryColor?.toLowerCase()) &&
                (!b.accentColor || b.accentColor?.toLowerCase() === formState.accentColor?.toLowerCase()) &&
                (!b.backgroundColor || b.backgroundColor?.toLowerCase() === formState.backgroundColor?.toLowerCase()) &&
                (!b.gradientFrom || b.gradientFrom?.toLowerCase() === formState.gradientFrom?.toLowerCase()) &&
                (!b.gradientTo || b.gradientTo?.toLowerCase() === formState.gradientTo?.toLowerCase());

            if (!isMatch) {
                recs.push({
                    field: "branding",
                    label: "Branding Preset",
                    value: client.branding,
                    displayValue: client.branding.fontFamily || client.branding.primaryColor || "Custom",
                    explanation: "Previously used branding (font, colors, background)",
                });
            }
        }

        return recs;
    }, [
        smartDefaults,
        formState.currency,
        formState.reminderTone,
        formState.primaryColor,
        formState.fontFamily,
        formState.accentColor,
        formState.backgroundColor,
        formState.gradientFrom,
        formState.gradientTo,
    ]);

    // Apply a single recommendation
    const applyRecommendation = useCallback(
        (field: string, value: any) => {
            if (field === "branding" && typeof value === "object") {
                const branding = value as {
                    fontFamily?: string;
                    primaryColor?: string;
                    accentColor?: string;
                    backgroundColor?: string;
                    gradientFrom?: string;
                    gradientTo?: string;
                };

                const newFormState = { ...formState };
                if (branding.fontFamily) newFormState.fontFamily = branding.fontFamily;
                if (branding.primaryColor) newFormState.primaryColor = branding.primaryColor;
                if (branding.accentColor) newFormState.accentColor = branding.accentColor;
                if (branding.backgroundColor) newFormState.backgroundColor = branding.backgroundColor;
                if (branding.gradientFrom) newFormState.gradientFrom = branding.gradientFrom;
                if (branding.gradientTo) newFormState.gradientTo = branding.gradientTo;

                onFormStateChange(newFormState);
                return;
            }
            onFormStateChange({ ...formState, [field]: value });
        },
        [formState, onFormStateChange]
    );

    // Apply all client recommendations
    const applyAllRecommendations = useCallback(() => {
        const recs = getClientRecommendations();
        let newState = { ...formState };

        for (const rec of recs) {
            if (rec.field === "branding" && typeof rec.value === "object") {
                newState = { ...newState, ...rec.value };
            } else {
                newState = { ...newState, [rec.field]: rec.value };
            }
        }
        onFormStateChange(newState);
    }, [formState, onFormStateChange, getClientRecommendations]);

    // Apply due date recommendation
    const applyDueDate = useCallback(() => {
        if (smartDefaults?.client?.safeDueDate) {
            onFormStateChange({
                ...formState,
                dueDate: new Date(smartDefaults.client.safeDueDate.date).toISOString().slice(0, 10),
            });
            setAppliedDueDate(true);
        }
    }, [smartDefaults, formState, onFormStateChange]);

    return {
        smartDefaults,
        dismissed,
        setDismissed,
        appliedDueDate,
        getClientRecommendations,
        applyRecommendation,
        applyAllRecommendations,
        applyDueDate,
        setAppliedDueDate,
    };
}

/**
 * Hook to manage billable items from a project
 * Fetches and applies billable items and milestones to invoice
 */
export function useBillableItems(
    formState: InvoiceFormState,
    onFormStateChange: (state: InvoiceFormState) => void,
    smartDefaults: SmartDefaultsResponse | null
) {
    const [billableItems, setBillableItems] = useState<BillableItemsState>({
        items: [],
        nextMilestone: null,
        loading: false,
    });
    const [dismissed, setDismissed] = useState(false);

    // Fetch billable items when project is selected
    useEffect(() => {
        if (!formState.projectId) {
            setBillableItems({ items: [], nextMilestone: null, loading: false });
            return;
        }

        const fetchBillableItems = async () => {
            setBillableItems((prev) => ({ ...prev, loading: true }));
            try {
                const res = await fetch(`/api/projects/${formState.projectId}/extract-billable-items`);
                if (res.ok) {
                    const data = await res.json();
                    const projectData = smartDefaults?.project;
                    setBillableItems({
                        items: data.items || [],
                        nextMilestone: projectData?.nextMilestone || null,
                        loading: false,
                    });
                    setDismissed(false);
                }
            } catch (error) {
                console.error("Failed to fetch billable items:", error);
                setBillableItems((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchBillableItems();
    }, [formState.projectId, smartDefaults?.project]);

    // Check if item is already added
    const isItemAdded = useCallback(
        (title: string, unitPrice: number) => {
            return formState.items?.some((i) => i.title === title && i.unitPrice === unitPrice) || false;
        },
        [formState.items]
    );

    // Get default tax rate
    const getDefaultTaxRate = useCallback(() => {
        return formState.taxSettings?.defaultRate ?? formState.items.find((i) => (i.taxRate || 0) > 0)?.taxRate ?? 0;
    }, [formState.taxSettings, formState.items]);

    // Apply a single billable item
    const applyBillableItem = useCallback(
        (item: { title: string; description?: string; quantity: number; unitPrice: number }) => {
            if (isItemAdded(item.title, item.unitPrice)) {
                return false;
            }
            onFormStateChange({
                ...formState,
                items: [
                    ...formState.items,
                    {
                        title: item.title,
                        description: item.description || "",
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: getDefaultTaxRate(),
                    },
                ],
            });
            return true;
        },
        [formState, onFormStateChange, isItemAdded, getDefaultTaxRate]
    );

    // Apply next milestone as invoice item
    const applyNextMilestone = useCallback(() => {
        if (!billableItems.nextMilestone) return false;
        const m = billableItems.nextMilestone;
        const unitPrice = m.amount / 100;

        if (isItemAdded(m.title, unitPrice)) {
            return false;
        }

        onFormStateChange({
            ...formState,
            items: [
                ...formState.items,
                {
                    title: m.title,
                    description: `Milestone payment`,
                    quantity: 1,
                    unitPrice: unitPrice,
                    taxRate: getDefaultTaxRate(),
                },
            ],
        });
        return true;
    }, [billableItems.nextMilestone, formState, onFormStateChange, isItemAdded, getDefaultTaxRate]);

    // Apply all billable items
    const applyAllBillableItems = useCallback(() => {
        const itemsToAdd = billableItems.items.filter((item) => !isItemAdded(item.title, item.unitPrice));

        if (itemsToAdd.length === 0) {
            return 0;
        }

        const newInvoiceItems = itemsToAdd.map((item) => ({
            title: item.title,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: getDefaultTaxRate(),
        }));

        onFormStateChange({
            ...formState,
            items: [...formState.items, ...newInvoiceItems],
        });

        return newInvoiceItems.length;
    }, [billableItems.items, formState, onFormStateChange, isItemAdded, getDefaultTaxRate]);

    return {
        billableItems,
        dismissed,
        setDismissed,
        isItemAdded,
        applyBillableItem,
        applyNextMilestone,
        applyAllBillableItems,
    };
}

/**
 * Hook to manage recent branding presets
 * Saves and loads branding presets from localStorage
 */
export function useRecentBranding(formState: InvoiceFormState) {
    const [recentBranding, setRecentBranding] = useState<
        { name: string; fontFamily?: string; primaryColor?: string; accentColor?: string; backgroundColor?: string }[]
    >([]);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem("pc_branding_recent");
        if (stored) {
            try {
                setRecentBranding(JSON.parse(stored));
            } catch {
                setRecentBranding([]);
            }
        }
    }, []);

    // Save a new branding preset
    const saveRecent = useCallback(
        (name: string) => {
            const entry = {
                name,
                fontFamily: formState.fontFamily,
                primaryColor: formState.primaryColor,
                accentColor: formState.accentColor,
                backgroundColor: formState.backgroundColor,
            };
            const next = [entry, ...recentBranding].slice(0, 5);
            setRecentBranding(next);
            if (typeof window !== "undefined") {
                window.localStorage.setItem("pc_branding_recent", JSON.stringify(next));
            }
        },
        [formState, recentBranding]
    );

    return {
        recentBranding,
        saveRecent,
    };
}
