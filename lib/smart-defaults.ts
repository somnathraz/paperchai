/**
 * Smart Defaults - AI-Light Recommendation Engine
 * 
 * Provides intelligent suggestions based on:
 * - Workspace patterns (all invoices)
 * - Client behavior (client-specific invoices)
 * - Project history (project-specific invoices)
 */

import { prisma } from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export type WorkspaceDefaults = {
    currency: { value: string; count: number } | null;
    taxInclusive: { value: boolean; count: number } | null;
    taxRate: { value: number; count: number } | null;
    theme: { value: string; count: number } | null;
    reminderTone: { value: string; count: number } | null;
    paymentTermDays: { value: number; count: number } | null;
    invoicePrefix: { value: string; count: number } | null;
    totalInvoicesAnalyzed: number;
};

export type ClientDefaults = {
    currency: { value: string; count: number } | null;
    paymentTermDays: { value: number; count: number } | null;
    reminderTone: { value: string; count: number } | null;
    theme: { value: string; count: number } | null;
    projectId: { value: string; name: string; count: number } | null;
    notes: { value: string; count: number } | null;
    branding: {
        fontFamily?: string;
        primaryColor?: string;
        accentColor?: string;
        backgroundColor?: string;
        gradientFrom?: string;
        gradientTo?: string;
    } | null;
    reliabilityScore: number;
    averageDelayDays: number;
    safeDueDate: { date: Date; explanation: string } | null;
    totalInvoicesAnalyzed: number;
};

export type MilestoneInfo = {
    id: string;
    title: string;
    description?: string | null;
    amount: number;
    currency: string;
    status: string;
    invoiceId?: string | null;
    expectedDate?: Date | null;
    dueDate?: Date | null;
    autoInvoiceEnabled: boolean;
    orderIndex: number;
};

export type ProjectDefaults = {
    // Predefined billable items from project config
    billableItems: Array<{
        title: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
    }>;
    // Milestones with status info
    milestones: MilestoneInfo[];
    // Next billable milestone (READY_TO_BILL or first PLANNED)
    nextMilestone: MilestoneInfo | null;
    // Already has invoices in progress
    existingDraftInvoice: { id: string; number: string } | null;
    // Project automation status
    automation: {
        autoInvoiceEnabled: boolean;
        autoRemindersEnabled: boolean;
        type: string;
        billingStrategy: string;
    };
    // Historical items from past invoices
    historicalItems: Array<{
        title: string;
        unitPrice: number;
        quantity: number;
        count: number;
    }>;
    taxRate: { value: number; count: number } | null;
    notes: { value: string; count: number } | null;
    terms: { value: string; count: number } | null;
    totalInvoicesAnalyzed: number;
};

// ============================================================================
// Workspace Defaults
// ============================================================================

export async function getWorkspaceDefaults(workspaceId: string): Promise<WorkspaceDefaults> {
    // Get last 50 invoices for analysis
    const invoices = await prisma.invoice.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
            currency: true,
            reminderTone: true,
            issueDate: true,
            dueDate: true,
            number: true,
            sendMeta: true,
            template: { select: { slug: true } },
        },
    });

    if (invoices.length === 0) {
        return {
            currency: null,
            taxInclusive: null,
            taxRate: null,
            theme: null,
            reminderTone: null,
            paymentTermDays: null,
            invoicePrefix: null,
            totalInvoicesAnalyzed: 0,
        };
    }

    // Count occurrences
    const currencyCount: Record<string, number> = {};
    const themeCount: Record<string, number> = {};
    const toneCount: Record<string, number> = {};
    const prefixCount: Record<string, number> = {};
    const taxInclusiveCount = { true: 0, false: 0 };
    const taxRates: number[] = [];
    const paymentTerms: number[] = [];

    for (const inv of invoices) {
        // Currency
        if (inv.currency) {
            currencyCount[inv.currency] = (currencyCount[inv.currency] || 0) + 1;
        }

        // Theme
        if (inv.template?.slug) {
            themeCount[inv.template.slug] = (themeCount[inv.template.slug] || 0) + 1;
        }

        // Reminder tone
        if (inv.reminderTone) {
            toneCount[inv.reminderTone] = (toneCount[inv.reminderTone] || 0) + 1;
        }

        // Invoice prefix (extract from number like "INV-2024-001")
        const prefix = inv.number?.match(/^([A-Za-z]+)/)?.[1];
        if (prefix) {
            prefixCount[prefix] = (prefixCount[prefix] || 0) + 1;
        }

        // Tax settings from sendMeta
        const sendMeta = inv.sendMeta as any;
        if (sendMeta?.taxSettings) {
            if (sendMeta.taxSettings.inclusive === true) {
                taxInclusiveCount.true++;
            } else {
                taxInclusiveCount.false++;
            }
            if (typeof sendMeta.taxSettings.defaultRate === "number") {
                taxRates.push(sendMeta.taxSettings.defaultRate);
            }
        }

        // Payment term (days between issue and due)
        if (inv.issueDate && inv.dueDate) {
            const days = Math.round(
                (new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days > 0 && days < 365) {
                paymentTerms.push(days);
            }
        }
    }

    return {
        currency: getMostCommon(currencyCount),
        taxInclusive: taxInclusiveCount.true > taxInclusiveCount.false
            ? { value: true, count: taxInclusiveCount.true }
            : taxInclusiveCount.false > 0
                ? { value: false, count: taxInclusiveCount.false }
                : null,
        taxRate: taxRates.length > 0
            ? { value: mode(taxRates), count: taxRates.length }
            : null,
        theme: getMostCommon(themeCount),
        reminderTone: getMostCommon(toneCount),
        paymentTermDays: paymentTerms.length > 0
            ? { value: mode(paymentTerms), count: paymentTerms.length }
            : null,
        invoicePrefix: getMostCommon(prefixCount),
        totalInvoicesAnalyzed: invoices.length,
    };
}

// ============================================================================
// Client Defaults
// ============================================================================

export async function getClientDefaults(clientId: string): Promise<ClientDefaults> {
    // Get client info
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
            reliabilityScore: true,
            averageDelayDays: true,
        },
    });

    // Get last 20 invoices for this client
    const invoices = await prisma.invoice.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
            currency: true,
            reminderTone: true,
            issueDate: true,
            dueDate: true,
            notes: true,
            sendMeta: true,
            projectId: true,
            project: { select: { name: true } },
            template: { select: { slug: true } },
        },
    });

    if (invoices.length === 0) {
        return {
            currency: null,
            paymentTermDays: null,
            reminderTone: null,
            theme: null,
            projectId: null,
            notes: null,
            branding: null,
            reliabilityScore: client?.reliabilityScore ?? 100,
            averageDelayDays: client?.averageDelayDays ?? 0,
            safeDueDate: computeSafeDueDate(
                client?.reliabilityScore ?? 100,
                client?.averageDelayDays ?? 0
            ),
            totalInvoicesAnalyzed: 0,
        };
    }

    // Count occurrences
    const currencyCount: Record<string, number> = {};
    const themeCount: Record<string, number> = {};
    const toneCount: Record<string, number> = {};
    const projectCount: Record<string, { name: string; count: number }> = {};
    const notesCount: Record<string, number> = {};
    const paymentTerms: number[] = [];
    let lastBranding: ClientDefaults["branding"] = null;

    for (const inv of invoices) {
        if (inv.currency) {
            currencyCount[inv.currency] = (currencyCount[inv.currency] || 0) + 1;
        }
        if (inv.template?.slug) {
            themeCount[inv.template.slug] = (themeCount[inv.template.slug] || 0) + 1;
        }
        if (inv.reminderTone) {
            toneCount[inv.reminderTone] = (toneCount[inv.reminderTone] || 0) + 1;
        }
        if (inv.projectId && inv.project?.name) {
            if (!projectCount[inv.projectId]) {
                projectCount[inv.projectId] = { name: inv.project.name, count: 0 };
            }
            projectCount[inv.projectId].count++;
        }
        if (inv.notes && inv.notes.trim().length > 10) {
            notesCount[inv.notes] = (notesCount[inv.notes] || 0) + 1;
        }
        if (inv.issueDate && inv.dueDate) {
            const days = Math.round(
                (new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days > 0 && days < 365) {
                paymentTerms.push(days);
            }
        }

        // Get branding from most recent invoice
        if (!lastBranding) {
            const sendMeta = inv.sendMeta as any;
            if (sendMeta?.branding) {
                lastBranding = {
                    fontFamily: sendMeta.branding.fontFamily,
                    primaryColor: sendMeta.branding.primaryColor,
                    accentColor: sendMeta.branding.accentColor,
                    backgroundColor: sendMeta.branding.backgroundColor,
                    gradientFrom: sendMeta.branding.gradientFrom,
                    gradientTo: sendMeta.branding.gradientTo,
                };
            }
        }
    }

    // Find most common project
    let topProject: { value: string; name: string; count: number } | null = null;
    for (const [id, data] of Object.entries(projectCount)) {
        if (!topProject || data.count > topProject.count) {
            topProject = { value: id, name: data.name, count: data.count };
        }
    }

    return {
        currency: getMostCommon(currencyCount),
        paymentTermDays: paymentTerms.length > 0
            ? { value: mode(paymentTerms), count: paymentTerms.length }
            : null,
        reminderTone: getMostCommon(toneCount),
        theme: getMostCommon(themeCount),
        projectId: topProject,
        notes: getMostCommon(notesCount),
        branding: lastBranding,
        reliabilityScore: client?.reliabilityScore ?? 100,
        averageDelayDays: client?.averageDelayDays ?? 0,
        safeDueDate: computeSafeDueDate(
            client?.reliabilityScore ?? 100,
            client?.averageDelayDays ?? 0
        ),
        totalInvoicesAnalyzed: invoices.length,
    };
}

// ============================================================================
// Project Defaults
// ============================================================================

export async function getProjectDefaults(projectId: string): Promise<ProjectDefaults> {
    // Get project with its milestones, billable items, and related invoices
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            type: true,
            billingStrategy: true,
            autoInvoiceEnabled: true,
            autoRemindersEnabled: true,
            billableItems: true,
            milestones: {
                orderBy: { orderIndex: "asc" },
            },
            invoices: {
                where: { status: "draft" },
                select: { id: true, number: true },
                take: 1,
            },
        },
    });

    // Get last 10 invoices for historical analysis
    const invoices = await prisma.invoice.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
            items: true,
        },
    });

    // Parse billable items from JSON
    const billableItems: ProjectDefaults["billableItems"] = [];
    if (project?.billableItems && Array.isArray(project.billableItems)) {
        for (const item of project.billableItems as any[]) {
            billableItems.push({
                title: item.title || "",
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                taxRate: item.taxRate,
            });
        }
    }

    // Map milestones
    const milestones: MilestoneInfo[] = (project?.milestones || []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        amount: m.amount,
        currency: m.currency,
        status: m.status,
        invoiceId: m.invoiceId,
        expectedDate: m.expectedDate,
        dueDate: m.dueDate,
        autoInvoiceEnabled: m.autoInvoiceEnabled,
        orderIndex: m.orderIndex,
    }));

    // Find next billable milestone (READY_TO_BILL or first not-invoiced PLANNED)
    let nextMilestone: MilestoneInfo | null = null;
    for (const m of milestones) {
        if (m.status === "READY_TO_BILL" && !m.invoiceId) {
            nextMilestone = m;
            break;
        }
    }
    if (!nextMilestone) {
        // Fallback to first PLANNED milestone
        nextMilestone = milestones.find(m => m.status === "PLANNED" && !m.invoiceId) || null;
    }

    // Check for existing draft invoice
    const existingDraftInvoice = project?.invoices?.[0]
        ? { id: project.invoices[0].id, number: project.invoices[0].number }
        : null;

    // Analyze historical items from past invoices
    const itemCount: Record<string, { title: string; unitPrice: number; quantity: number; count: number }> = {};
    const taxRates: number[] = [];
    const notesCount: Record<string, number> = {};
    const termsCount: Record<string, number> = {};

    for (const inv of invoices) {
        for (const item of inv.items) {
            const key = item.title.toLowerCase().trim();
            if (!itemCount[key]) {
                itemCount[key] = {
                    title: item.title,
                    unitPrice: Number(item.unitPrice) || 0,
                    quantity: Number(item.quantity) || 1,
                    count: 0,
                };
            }
            itemCount[key].count++;
        }

        const sendMeta = inv.sendMeta as any;
        if (typeof sendMeta?.taxSettings?.defaultRate === "number") {
            taxRates.push(sendMeta.taxSettings.defaultRate);
        }

        if (inv.notes && inv.notes.trim().length > 10) {
            notesCount[inv.notes] = (notesCount[inv.notes] || 0) + 1;
        }
        if (inv.terms && inv.terms.trim().length > 10) {
            termsCount[inv.terms] = (termsCount[inv.terms] || 0) + 1;
        }
    }

    // Sort historical items by count
    const historicalItems = Object.values(itemCount)
        .filter(item => item.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        billableItems,
        milestones,
        nextMilestone,
        existingDraftInvoice,
        automation: {
            autoInvoiceEnabled: project?.autoInvoiceEnabled ?? false,
            autoRemindersEnabled: project?.autoRemindersEnabled ?? false,
            type: project?.type ?? "FIXED",
            billingStrategy: project?.billingStrategy ?? "SINGLE_INVOICE",
        },
        historicalItems,
        taxRate: taxRates.length > 0
            ? { value: mode(taxRates), count: taxRates.length }
            : null,
        notes: getMostCommon(notesCount),
        terms: getMostCommon(termsCount),
        totalInvoicesAnalyzed: invoices.length,
    };
}


// ============================================================================
// Smart Due Date Calculation
// ============================================================================

export function computeSafeDueDate(
    reliabilityScore: number,
    averageDelayDays: number
): { date: Date; explanation: string } {
    const baseTermDays = 30; // Standard NET 30
    let adjustedDays = baseTermDays;

    // Adjust based on reliability
    if (reliabilityScore < 50) {
        adjustedDays = 7; // Unreliable: NET 7
    } else if (reliabilityScore < 70) {
        adjustedDays = 15; // Moderate: NET 15
    } else if (reliabilityScore >= 90) {
        adjustedDays = 45; // Excellent: NET 45
    }

    // Add buffer based on historical delays (max 14 days buffer)
    const safeBuffer = Math.min(14, Math.max(0, Math.round(averageDelayDays * 0.5)));
    const totalDays = adjustedDays + safeBuffer;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + totalDays);

    let explanation: string;
    if (reliabilityScore >= 90) {
        explanation = `NET ${adjustedDays} (Excellent reliability: ${reliabilityScore}%)`;
    } else if (reliabilityScore >= 70) {
        explanation = `NET ${adjustedDays} + ${safeBuffer}d buffer (${reliabilityScore}% reliable)`;
    } else if (reliabilityScore >= 50) {
        explanation = `NET ${adjustedDays} + ${safeBuffer}d buffer (Moderate reliability)`;
    } else {
        explanation = `NET ${adjustedDays} (Low reliability - shorter terms recommended)`;
    }

    return { date: dueDate, explanation };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMostCommon<T extends string>(counts: Record<T, number>): { value: T; count: number } | null {
    let maxKey: T | null = null;
    let maxCount = 0;

    for (const [key, count] of Object.entries(counts) as [T, number][]) {
        if (count > maxCount) {
            maxCount = count;
            maxKey = key;
        }
    }

    return maxKey ? { value: maxKey, count: maxCount } : null;
}

function mode(arr: number[]): number {
    if (arr.length === 0) return 0;

    const counts: Record<number, number> = {};
    let maxVal = arr[0];
    let maxCount = 1;

    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
            maxCount = counts[val];
            maxVal = val;
        }
    }

    return maxVal;
}
