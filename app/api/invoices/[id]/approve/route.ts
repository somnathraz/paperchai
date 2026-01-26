import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { sendInvoiceEmail } from "@/lib/invoices/send-invoice";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";

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

    const invoice = await prisma.invoice.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
    const automation = sendMeta.automation || {};
    if (automation.approvalStatus !== "PENDING") {
      return NextResponse.json({ error: "Invoice does not require approval" }, { status: 400 });
    }

    const now = new Date();
    const scheduledFromMeta = automation.scheduledSendAt
      ? new Date(automation.scheduledSendAt)
      : null;
    const scheduledFromInvoice = invoice.scheduledSendAt ? new Date(invoice.scheduledSendAt) : null;
    const scheduledFromDue = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const scheduledSendAt = scheduledFromMeta || scheduledFromInvoice || scheduledFromDue;
    const validScheduled =
      scheduledSendAt && !Number.isNaN(scheduledSendAt.getTime()) ? scheduledSendAt : null;

    const nextAutomation = {
      ...automation,
      approvalStatus: "APPROVED",
      approvedAt: now.toISOString(),
      approvedBy: session.user.id,
      scheduledSendAt: validScheduled ? validScheduled.toISOString() : automation.scheduledSendAt,
    };

    if (validScheduled && validScheduled.getTime() > now.getTime()) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "scheduled",
          scheduledSendAt: validScheduled,
          sendMeta: {
            ...sendMeta,
            automation: nextAutomation,
          },
        },
      });

      return NextResponse.json({
        invoice: {
          id: updated.id,
          status: updated.status,
          scheduledSendAt: updated.scheduledSendAt,
        },
        action: "scheduled",
        delayed: false,
        message: "Approved. Scheduled to send later.",
      });
    }

    const rateCheck = await checkRateLimitByProfile(req, "emailSend", workspace.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many emails sent. Please try again later." },
        { status: 429 }
      );
    }

    const delayed = validScheduled ? validScheduled.getTime() < now.getTime() : false;
    const result = await sendInvoiceEmail({
      invoiceId: invoice.id,
      workspaceId: workspace.id,
      channel: "email",
      sendMeta: { automation: nextAutomation },
    });

    return NextResponse.json({
      invoice: result.invoice,
      action: "sent",
      delayed,
      sentTo: result.sentTo,
      message: delayed ? "Approved late. Invoice sent immediately." : "Approved and sent.",
    });
  } catch (error) {
    console.error("[INVOICE_APPROVE]", error);
    return NextResponse.json({ error: "Failed to approve invoice" }, { status: 500 });
  }
}
