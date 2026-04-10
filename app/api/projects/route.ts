import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { assertLimit } from "@/lib/usage";
import { serializeEntitlementError } from "@/lib/entitlements";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }
  if (!canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name,
    description,
    clientId,
    rateType,
    rateValue,
    defaultTax,
    defaultCurrency,
    startDate,
    endDate,
    attachments,
    billingMode,
    paymentSchedule,
    billableItems,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    await assertLimit(workspace.id, session.user.id, "projects");

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        clientId,
        rateType,
        rateValue,
        defaultTax,
        defaultCurrency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        attachments,
        workspaceId: workspace.id,
        billingMode: billingMode || "single",
        paymentSchedule: Array.isArray(paymentSchedule)
          ? paymentSchedule
          : paymentSchedule
            ? String(paymentSchedule)
                .split("\n")
                .map((line: string) => line.trim())
                .filter(Boolean)
            : undefined,
        billableItems: billableItems || undefined,
      },
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    if (error?.code === "PLAN_LIMIT_REACHED" || error?.code === "SUBSCRIPTION_INACTIVE") {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
    }
    console.error("Error creating project:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
