import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const rule = await prisma.automationRule.findUnique({
      where: { id },
    });

    if (!rule || rule.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        workspaceId: workspace.id,
        sendMeta: {
          path: ["automation", "ruleId"],
          equals: id,
        },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const results = invoices.map((invoice) => {
      const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
      const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
      const automation = sendMeta.automation || {};
      return {
        id: invoice.id,
        number: invoice.number,
        clientName: invoice.client?.name || "Unknown",
        status: invoice.status,
        amount: total ? Number(total) : 0,
        currency: invoice.currency || "INR",
        createdAt: invoice.createdAt,
        approvalStatus: automation.approvalStatus,
      };
    });

    return NextResponse.json({ invoices: results });
  } catch (error) {
    console.error("[AUTOMATION_RULE_INVOICES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch automation invoices" }, { status: 500 });
  }
}
