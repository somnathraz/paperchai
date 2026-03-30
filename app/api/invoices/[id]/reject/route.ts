import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { getClientInfo, logAuditEvent } from "@/lib/security/audit-log";
import { notifySlackApprovalResult } from "@/lib/integrations/slack/notifications";

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

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

    const canApprove = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canApprove) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can reject" },
        { status: 403 }
      );
    }

    const payload = rejectSchema.parse(await req.json().catch(() => ({})));
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, workspaceId: workspace.id },
      select: { id: true, number: true, sendMeta: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
    const automation = sendMeta.automation || {};
    const slackContext = automation?.slack as
      | {
          responseUrl?: string;
          channelId?: string;
          threadTs?: string;
        }
      | undefined;
    if (automation.approvalStatus !== "PENDING") {
      return NextResponse.json({ error: "Invoice is not pending approval" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "draft",
        scheduledSendAt: null,
        sendMeta: {
          ...sendMeta,
          automation: {
            ...automation,
            approvalStatus: "REJECTED",
            rejectedAt: now,
            rejectedBy: session.user.id,
            rejectionReason: payload.reason || "Rejected by approver",
          },
        },
      },
      select: { id: true, status: true },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "INVOICE_UPDATED",
      workspaceId: workspace.id,
      resourceType: "INVOICE",
      resourceId: updated.id,
      metadata: {
        operation: "AUTOMATION_APPROVAL_REJECT",
        reason: payload.reason || null,
      },
      ...getClientInfo(req),
    });
    await prisma.approvalRequest.updateMany({
      where: {
        workspaceId: workspace.id,
        invoiceId: updated.id,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        approverUserId: session.user.id,
        decisionNote: payload.reason || "Rejected by approver",
        decidedAt: new Date(),
      },
    });
    await notifySlackApprovalResult({
      workspaceId: workspace.id,
      invoiceId: updated.id,
      status: "REJECTED",
      text: `Invoice ${invoice.number} rejected${payload.reason ? `: ${payload.reason}` : "."}`,
      responseUrl: slackContext?.responseUrl,
      channelId: slackContext?.channelId,
      threadTs: slackContext?.threadTs,
    });

    return NextResponse.json({
      invoice: updated,
      message: "Invoice rejected and returned to draft.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
    }
    console.error("[INVOICE_REJECT]", error);
    return NextResponse.json({ error: "Failed to reject invoice" }, { status: 500 });
  }
}
