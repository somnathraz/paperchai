import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const actionSchema = z.object({
  action: z.enum(["retry", "skip", "dismiss"]),
  stepId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
  } catch (error) {
    return NextResponse.json(serializeEntitlementError(error), {
      status: (error as any)?.statusCode || 403,
    });
  }

  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership || !canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }

  const { action, stepId } = parsed.data;
  const rateCheck = checkRateLimitByProfile(req, "general", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.error || "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const step = await prisma.invoiceReminderStep.findFirst({
    where: {
      id: stepId,
      schedule: {
        workspaceId: workspace.id,
        enabled: true,
      },
    },
    include: {
      schedule: {
        include: {
          invoice: {
            select: { id: true, status: true, clientId: true },
          },
        },
      },
    },
  });

  if (!step) {
    return NextResponse.json({ error: "Reminder step not found" }, { status: 404 });
  }

  if (["paid", "cancelled"].includes(step.schedule.invoice.status)) {
    return NextResponse.json(
      { error: `Cannot update reminder for invoice in '${step.schedule.invoice.status}' status` },
      { status: 409 }
    );
  }

  if (action === "retry" && !["FAILED", "SKIPPED", "PENDING"].includes(step.status)) {
    return NextResponse.json(
      { error: `Cannot retry reminder from '${step.status.toLowerCase()}' state` },
      { status: 409 }
    );
  }

  if ((action === "skip" || action === "dismiss") && step.status === "SENT") {
    return NextResponse.json({ error: "Cannot skip a sent reminder" }, { status: 409 });
  }

  const updated = await prisma.invoiceReminderStep.update({
    where: { id: stepId },
    data:
      action === "retry"
        ? {
            status: "PENDING",
            sendAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          }
        : {
            status: "SKIPPED",
            updatedAt: new Date(),
          },
  });

  await prisma.reminderHistory.create({
    data: {
      workspaceId: workspace.id,
      clientId: step.schedule.invoice.clientId,
      invoiceId: step.schedule.invoice.id,
      channel: "email",
      kind: "action",
      status: action === "retry" ? "pending" : "skipped",
      sentAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    step: {
      id: updated.id,
      status: updated.status,
      sendAt: updated.sendAt,
    },
  });
}
