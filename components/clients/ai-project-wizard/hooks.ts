import { useCallback } from "react";
import type { ExtractedData } from "./types";

/**
 * Hook to validate project data before saving
 */
export function useProjectValidation() {
    const validateProjectData = useCallback((data: ExtractedData | null): string[] => {
        if (!data) return ["No data to validate"];
        const errors: string[] = [];

        // 1. Required Fields
        if (!data.client.name?.trim()) errors.push("Client Name is required");
        if (!data.project.name?.trim()) errors.push("Project Name is required");

        // 2. Budget Logic
        if (data.project.totalBudget < 0) errors.push("Total Budget cannot be negative");

        // Strategy-Specific Budget Checks
        const milestoneSum = data.milestones.reduce((sum, m) => sum + m.amount, 0);

        if (
            ["FIXED", "MILESTONE"].includes(data.project.type) ||
            data.project.billingStrategy === "PER_MILESTONE"
        ) {
            // Milestones can be less than budget but cannot exceed it
            if (milestoneSum > data.project.totalBudget + 100) {
                // Tolerance of 1.00
                errors.push(
                    `Milestone total (${data.project.currency} ${(milestoneSum / 100).toFixed(2)}) exceeds Project Budget`
                );
            }
        }

        if (data.project.billingStrategy === "SINGLE_INVOICE" && data.milestones.length > 1) {
            errors.push("Single Invoice strategy should typically have only one milestone/payment event.");
        }

        if (data.project.billingStrategy === "PER_MILESTONE" && data.milestones.length === 0) {
            errors.push("At least one milestone is required for 'Per Milestone' billing.");
        }

        // 3. Date Logic
        if (data.project.startDate && data.project.endDate) {
            if (new Date(data.project.startDate) > new Date(data.project.endDate)) {
                errors.push("Project Start Date must be before End Date");
            }
        }

        // 4. Data Integrity
        if (data.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client.email)) {
            errors.push("Invalid Client Email format");
        }

        return errors;
    }, []);

    return { validateProjectData };
}

/**
 * Hook to check for duplicate clients
 */
export function useDuplicateDetection() {
    const checkDuplicateClient = useCallback(async (name: string, email: string) => {
        try {
            const params = new URLSearchParams();
            if (name) params.append("search", name);

            const res = await fetch(`/api/clients?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                // Filter for likely matches (Exact ignore case + trim)
                const match = result.clients.find(
                    (c: any) =>
                        c.name.toLowerCase().trim() === name.toLowerCase().trim() ||
                        (email && c.email?.toLowerCase().trim() === email.toLowerCase().trim())
                );
                return match || null;
            }
            return null;
        } catch (e) {
            console.error("Failed to check duplicates", e);
            return null;
        }
    }, []);

    return { checkDuplicateClient };
}
