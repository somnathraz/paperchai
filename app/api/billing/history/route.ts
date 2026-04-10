import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const [billingAuditLogs, paymentEvents] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        workspaceId: workspace.id,
        action: { startsWith: "BILLING_" },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentEvent.findMany({
      where: {
        workspaceId: workspace.id,
        status: { in: ["PAID", "PARTIAL"] },
      },
      include: {
        invoice: { select: { number: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ billingAuditLogs, paymentEvents });
}
