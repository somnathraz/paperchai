import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export type ManualActionType =
  | "invoice_created"
  | "payment_received"
  | "marked_complete"
  | "skip_automation";

/**
 * POST /api/milestones/[id]/manual-action
 *
 * Record a manual action on a milestone to prevent duplicate automation.
 *
 * Body:
 * - actionType: "invoice_created" | "payment_received" | "marked_complete" | "skip_automation"
 * - invoiceId?: string (optional, if invoice was created)
 * - skipAutomation?: boolean (optional, explicitly skip future automation)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { id } = await params;
    const milestoneId = id;
    const body = await req.json();
    const { actionType, invoiceId, skipAutomation } = body as {
      actionType: ManualActionType;
      invoiceId?: string;
      skipAutomation?: boolean;
    };

    if (!actionType) {
      return NextResponse.json({ error: "actionType is required" }, { status: 400 });
    }

    // Verify milestone belongs to a project in user's workspace
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: { workspaceId: workspace.id },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Determine new status based on action
    let newStatus = milestone.status;
    if (actionType === "invoice_created") {
      newStatus = "INVOICED";
    } else if (actionType === "payment_received") {
      newStatus = "PAID";
    } else if (actionType === "marked_complete") {
      // MilestoneStatus doesn't have COMPLETED, mapping to PAID as terminal state
      newStatus = "PAID";
    }

    // Update milestone with manual action tracking
    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        lastManualActionAt: new Date(),
        manualActionType: actionType,
        status: newStatus,
        invoiceId: invoiceId || milestone.invoiceId,
        skipAutomation: skipAutomation ?? actionType === "skip_automation",
      },
    });

    return NextResponse.json({
      success: true,
      milestone: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        lastManualActionAt: updated.lastManualActionAt,
        manualActionType: updated.manualActionType,
        skipAutomation: updated.skipAutomation,
      },
    });
  } catch (error) {
    console.error("Error recording manual action:", error);
    return NextResponse.json({ error: "Failed to record action" }, { status: 500 });
  }
}

/**
 * GET /api/milestones/[id]/manual-action
 *
 * Get the manual action status for a milestone.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { id } = await params;

    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: id,
        project: { workspaceId: workspace.id },
      },
      select: {
        id: true,
        title: true,
        status: true,
        lastManualActionAt: true,
        manualActionType: true,
        skipAutomation: true,
        invoiceId: true,
        autoInvoiceEnabled: true,
        autoRemindersEnabled: true,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Calculate if automation should be skipped
    const shouldSkipAutomation =
      milestone.skipAutomation ||
      (milestone.status as string) === "PAID" ||
      milestone.status === "PAID" ||
      (milestone.lastManualActionAt &&
        new Date().getTime() - new Date(milestone.lastManualActionAt).getTime() <
          7 * 24 * 60 * 60 * 1000);

    return NextResponse.json({
      milestone,
      shouldSkipAutomation,
      reason: shouldSkipAutomation
        ? milestone.skipAutomation
          ? "Explicitly skipped"
          : (milestone.status as string) === "PAID"
            ? "Already paid"
            : "Recent manual action (within 7 days)"
        : null,
    });
  } catch (error) {
    console.error("Error getting milestone status:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
