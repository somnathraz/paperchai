import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";

type ApprovalItem = {
  id: string;
  number: string;
  clientName: string;
  amount: string;
  dueDate: string | null;
  requestedAt: string | null;
  scheduledSendAt: string | null;
  source?: string | null;
  requestedByExternalId?: string | null;
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ approvals: [] });
    }
    const canApprove = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canApprove) {
      return NextResponse.json({ approvals: [] });
    }

    const invoices = await prisma.invoice.findMany({
      where: { workspaceId: workspace.id, status: "draft" },
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const approvals: ApprovalItem[] = invoices
      .map((invoice) => {
        const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
        const automation = sendMeta.automation || {};
        if (automation.approvalStatus !== "PENDING") {
          return null;
        }

        const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
        return {
          id: invoice.id,
          number: invoice.number,
          clientName: invoice.client?.name || "Unknown",
          amount: formatCurrency(Number(total || 0), invoice.currency || "INR"),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
          requestedAt: automation.approvalRequestedAt || null,
          scheduledSendAt:
            automation.scheduledSendAt ||
            (invoice.scheduledSendAt ? new Date(invoice.scheduledSendAt).toISOString() : null),
          source: automation.source || null,
          requestedByExternalId: automation?.slack?.requestedBySlackUserId || null,
        };
      })
      .filter(Boolean) as ApprovalItem[];

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("[INVOICE_APPROVALS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
