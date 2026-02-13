import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { runRecurringPlan } from "@/lib/invoices/recurring-runner";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }
    const canManage = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can run recurring plans manually" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const plan = await prisma.recurringInvoicePlan.findFirst({
      where: { id, workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      select: { id: true, status: true, autoSend: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    if (plan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Plan must be active to run now" }, { status: 409 });
    }
    if (plan.autoSend) {
      const rateCheck = checkRateLimitByProfile(req, "emailSend", `ws:${workspace.id}`);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: "Too many run requests. Please try again later." },
          { status: 429 }
        );
      }
    }

    const result = await runRecurringPlan(plan.id, {
      force: true,
      triggerReason: "MANUAL",
    });

    return NextResponse.json({
      result,
      message: "Manual run finished",
    });
  } catch (error) {
    console.error("[AUTOMATION_RECURRING_RUN]", error);
    if (error instanceof Error && error.message.includes("not active")) {
      return NextResponse.json({ error: "Plan must be active to run now" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to run recurring plan" }, { status: 500 });
  }
}
