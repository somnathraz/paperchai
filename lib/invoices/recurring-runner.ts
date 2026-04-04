import { prisma } from "@/lib/prisma";
import { sendAutomationApprovalEmail } from "@/lib/invoices/approval-email";
import { sendInvoiceEmail } from "@/lib/invoices/send-invoice";
import { buildInvoiceFromRecurringPlan, computeNextRunAt } from "@/lib/invoices/recurring-plans";

type RunResult = {
  planId: string;
  runKey: string;
  status: "SKIPPED" | "DRAFT_CREATED" | "PENDING_APPROVAL" | "SENT" | "FAILED";
  invoiceId?: string;
  reason?: string;
  error?: string;
  nextRunAt: string;
};

type TriggerReason = "SCHEDULED" | "MANUAL";

function parsePlanAsBuildInput(plan: any) {
  return {
    id: plan.id,
    workspaceId: plan.workspaceId,
    clientId: plan.clientId,
    projectId: plan.projectId,
    sourceType: plan.sourceType,
    fallbackPolicy: plan.fallbackPolicy,
    minimumFee: plan.minimumFee,
    dueDaysAfterIssue: plan.dueDaysAfterIssue,
    currency: plan.currency,
    snapshot: (plan.snapshot as Record<string, any>) || null,
  };
}

export async function runRecurringPlan(
  planId: string,
  options?: { force?: boolean; triggerReason?: TriggerReason }
): Promise<RunResult> {
  const now = new Date();
  const force = options?.force === true;
  const triggerReason = options?.triggerReason || "SCHEDULED";

  const plan = await prisma.recurringInvoicePlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Recurring plan not found");
  }

  if (plan.status !== "ACTIVE") {
    throw new Error("Plan is not active");
  }

  if (!force && plan.nextRunAt.getTime() > now.getTime()) {
    throw new Error("Plan is not due yet");
  }

  const plannedRunAt = force ? now : new Date(plan.nextRunAt);
  const runKey = force
    ? `${plan.id}:manual:${plannedRunAt.toISOString()}`
    : `${plan.id}:${plannedRunAt.toISOString()}`;
  const nextRunAt = computeNextRunAt(
    plannedRunAt,
    plan.intervalUnit,
    plan.intervalValue,
    plan.monthlyDay
  );
  // Manual test runs should not shift billing cadence.
  const nextRunAtForPlan = force ? new Date(plan.nextRunAt) : nextRunAt;

  try {
    await prisma.recurringInvoiceRunLog.create({
      data: {
        planId: plan.id,
        workspaceId: plan.workspaceId,
        runKey,
        status: "PROCESSING",
        message: triggerReason === "MANUAL" ? "Manual test run started" : "Recurring cycle started",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        planId: plan.id,
        runKey,
        status: "SKIPPED",
        reason: "Run already processed",
        nextRunAt: nextRunAtForPlan.toISOString(),
      };
    }
    throw error;
  }

  try {
    const buildResult = await buildInvoiceFromRecurringPlan(parsePlanAsBuildInput(plan));

    if (buildResult.kind === "skipped") {
      await prisma.recurringInvoicePlan.update({
        where: { id: plan.id },
        data: {
          lastRunAt: now,
          lastError: buildResult.reason,
          nextRunAt: nextRunAtForPlan,
          runCount: { increment: 1 },
        },
      });
      await prisma.recurringInvoiceRunLog.update({
        where: { runKey },
        data: {
          status: "SKIPPED",
          message: buildResult.reason,
          data: {
            nextRunAt: nextRunAt.toISOString(),
            triggerReason,
          },
        },
      });

      return {
        planId: plan.id,
        runKey,
        status: "SKIPPED",
        reason: buildResult.reason,
        nextRunAt: nextRunAtForPlan.toISOString(),
      };
    }

    let outcome: RunResult["status"] = "DRAFT_CREATED";
    if (plan.autoSend) {
      if (plan.approvalRequired) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: buildResult.invoiceId },
          select: { sendMeta: true },
        });
        const sendMeta = (invoice?.sendMeta as Record<string, any>) || {};
        await prisma.invoice.update({
          where: { id: buildResult.invoiceId },
          data: {
            sendMeta: {
              ...sendMeta,
              automation: {
                ...(sendMeta.automation || {}),
                ruleId: plan.id,
                approvalStatus: "PENDING",
                approvalRequestedAt: now.toISOString(),
                scheduledSendAt: now.toISOString(),
              },
            },
          },
        });
        await sendAutomationApprovalEmail(buildResult.invoiceId);
        outcome = "PENDING_APPROVAL";
      } else {
        await sendInvoiceEmail({
          invoiceId: buildResult.invoiceId,
          workspaceId: plan.workspaceId,
          channel: (plan.channel as "email" | "whatsapp" | "both") || "email",
        });
        outcome = "SENT";
      }
    }

    await prisma.recurringInvoicePlan.update({
      where: { id: plan.id },
      data: {
        lastRunAt: now,
        lastSuccessAt: now,
        lastError: null,
        nextRunAt: nextRunAtForPlan,
        runCount: { increment: 1 },
      },
    });

    await prisma.recurringInvoiceRunLog.update({
      where: { runKey },
      data: {
        status: "SUCCESS",
        invoiceId: buildResult.invoiceId,
        message: outcome,
        data: {
          itemCount: buildResult.itemCount,
          amount: buildResult.amount,
          nextRunAt: nextRunAt.toISOString(),
          triggerReason,
        },
      },
    });

    return {
      planId: plan.id,
      runKey,
      status: outcome,
      invoiceId: buildResult.invoiceId,
      nextRunAt: nextRunAtForPlan.toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recurring run failure";
    await prisma.recurringInvoicePlan.update({
      where: { id: plan.id },
      data: {
        lastRunAt: now,
        lastError: message,
        nextRunAt: nextRunAtForPlan,
        runCount: { increment: 1 },
        failureCount: { increment: 1 },
      },
    });
    await prisma.recurringInvoiceRunLog.update({
      where: { runKey },
      data: {
        status: "FAILED",
        message,
        data: { nextRunAt: nextRunAt.toISOString(), triggerReason },
      },
    });

    return {
      planId: plan.id,
      runKey,
      status: "FAILED",
      error: message,
      nextRunAt: nextRunAtForPlan.toISOString(),
    };
  }
}
