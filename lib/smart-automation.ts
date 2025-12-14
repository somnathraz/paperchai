/**
 * Smart Automation Helpers
 * 
 * Functions to determine if automation should be skipped for milestones
 * based on manual actions taken by the user.
 */

import { prisma } from "@/lib/prisma";

const GRACE_PERIOD_DAYS = 7; // Skip automation for 7 days after manual action

export type AutomationCheckResult = {
    shouldSkip: boolean;
    reason: string | null;
    milestone: {
        id: string;
        title: string;
        status: string;
        lastManualActionAt: Date | null;
    } | null;
};

/**
 * Check if automation should be skipped for a milestone.
 * 
 * Skip automation if:
 * - skipAutomation is explicitly set to true
 * - milestone is already PAID or COMPLETED
 * - manual action was taken within the grace period (7 days)
 */
export async function shouldSkipMilestoneAutomation(milestoneId: string): Promise<AutomationCheckResult> {
    const milestone = await prisma.projectMilestone.findUnique({
        where: { id: milestoneId },
        select: {
            id: true,
            title: true,
            status: true,
            skipAutomation: true,
            lastManualActionAt: true,
            manualActionType: true,
            autoRemindersEnabled: true,
        },
    });

    if (!milestone) {
        return { shouldSkip: true, reason: "Milestone not found", milestone: null };
    }

    // Explicitly disabled
    if (!milestone.autoRemindersEnabled) {
        return {
            shouldSkip: true,
            reason: "Auto reminders disabled",
            milestone: { id: milestone.id, title: milestone.title, status: milestone.status, lastManualActionAt: milestone.lastManualActionAt },
        };
    }

    // Explicitly skipped
    if (milestone.skipAutomation) {
        return {
            shouldSkip: true,
            reason: "Explicitly skipped by user",
            milestone: { id: milestone.id, title: milestone.title, status: milestone.status, lastManualActionAt: milestone.lastManualActionAt },
        };
    }

    // Already completed statuses
    if (milestone.status === "PAID" || milestone.status === "COMPLETED") {
        return {
            shouldSkip: true,
            reason: `Already ${milestone.status.toLowerCase()}`,
            milestone: { id: milestone.id, title: milestone.title, status: milestone.status, lastManualActionAt: milestone.lastManualActionAt },
        };
    }

    // Check grace period for manual actions
    if (milestone.lastManualActionAt) {
        const daysSinceAction = Math.floor(
            (Date.now() - new Date(milestone.lastManualActionAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceAction < GRACE_PERIOD_DAYS) {
            return {
                shouldSkip: true,
                reason: `Manual action "${milestone.manualActionType}" taken ${daysSinceAction} days ago (grace period: ${GRACE_PERIOD_DAYS} days)`,
                milestone: { id: milestone.id, title: milestone.title, status: milestone.status, lastManualActionAt: milestone.lastManualActionAt },
            };
        }
    }

    // No reason to skip
    return {
        shouldSkip: false,
        reason: null,
        milestone: { id: milestone.id, title: milestone.title, status: milestone.status, lastManualActionAt: milestone.lastManualActionAt },
    };
}

/**
 * Record a manual action on a milestone.
 * 
 * Call this when:
 * - User manually creates an invoice for the milestone
 * - User marks milestone as complete/paid
 * - User receives payment notification
 */
export async function recordMilestoneManualAction(
    milestoneId: string,
    actionType: "invoice_created" | "payment_received" | "marked_complete" | "skip_automation",
    options?: {
        invoiceId?: string;
        skipAutomation?: boolean;
    }
) {
    // Determine new status based on action
    let statusUpdate: string | undefined;
    if (actionType === "invoice_created") {
        statusUpdate = "INVOICED";
    } else if (actionType === "payment_received") {
        statusUpdate = "PAID";
    } else if (actionType === "marked_complete") {
        statusUpdate = "COMPLETED";
    }

    return prisma.projectMilestone.update({
        where: { id: milestoneId },
        data: {
            lastManualActionAt: new Date(),
            manualActionType: actionType,
            ...(statusUpdate && { status: statusUpdate as any }),
            ...(options?.invoiceId && { invoiceId: options.invoiceId }),
            ...(options?.skipAutomation !== undefined && { skipAutomation: options.skipAutomation }),
        },
    });
}

/**
 * Get all milestones that need automated reminders.
 * 
 * Filters out:
 * - Milestones with skipAutomation = true
 * - Milestones with recent manual actions (within grace period)
 * - Already paid/completed milestones
 * - Milestones with autoRemindersEnabled = false
 */
export async function getMilestonesForAutomation(projectId?: string) {
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - GRACE_PERIOD_DAYS);

    const where: any = {
        autoRemindersEnabled: true,
        skipAutomation: false,
        status: { notIn: ["PAID", "COMPLETED"] },
        OR: [
            { lastManualActionAt: null },
            { lastManualActionAt: { lt: gracePeriodDate } },
        ],
    };

    if (projectId) {
        where.projectId = projectId;
    }

    return prisma.projectMilestone.findMany({
        where,
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    clientId: true,
                    client: { select: { name: true, email: true } },
                },
            },
        },
        orderBy: { dueDate: "asc" },
    });
}
