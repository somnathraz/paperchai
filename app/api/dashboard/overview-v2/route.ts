import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

type QueueItem = {
  id: string;
  type: "approval" | "failed_schedule" | "overdue_no_reminder" | "draft_due_soon";
  priority: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({
        actionQueue: [],
        kpis: {
          outstandingAmount: 0,
          balanceDueAmount: 0,
          collectedMtd: 0,
          collectedAllTime: 0,
          partialPaymentsAmount: 0,
          overdueAmount: 0,
          avgDaysToPay: 0,
          atRiskCount: 0,
        },
        pipelineCounts: {
          draft: 0,
          scheduled: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
        },
        automationHealth: {
          successRate7d: 100,
          failedJobs24h: 0,
          dueNext24h: 0,
          remindersSent7d: 0,
        },
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [invoices, recentReminderHistory, reminderStats7d, failedJobs24h, dueReminderSteps24h] =
      await Promise.all([
        prisma.invoice.findMany({
          where: { workspaceId: workspace.id },
          select: {
            id: true,
            number: true,
            status: true,
            dueDate: true,
            issueDate: true,
            updatedAt: true,
            scheduledSendAt: true,
            total: true,
            amountPaid: true,
            currency: true,
            sendMeta: true,
            client: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.reminderHistory.findMany({
          where: {
            workspaceId: workspace.id,
            status: "sent",
            sentAt: { gte: sevenDaysAgo },
          },
          select: { invoiceId: true },
        }),
        prisma.reminderHistory.groupBy({
          by: ["status"],
          where: {
            workspaceId: workspace.id,
            createdAt: { gte: sevenDaysAgo },
            kind: { in: ["send", "reminder", "schedule"] },
          },
          _count: { id: true },
        }),
        prisma.reminderHistory.count({
          where: {
            workspaceId: workspace.id,
            status: "failed",
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.invoiceReminderStep.count({
          where: {
            status: "PENDING",
            sendAt: { gte: now, lte: next24h },
            schedule: {
              workspaceId: workspace.id,
              enabled: true,
              invoice: {
                remindersEnabled: true,
                status: { in: ["sent", "overdue", "scheduled"] },
              },
            },
          },
        }),
      ]);

    const sentRecentlySet = new Set(
      recentReminderHistory.map((r) => r.invoiceId).filter((v): v is string => Boolean(v))
    );

    const queue: QueueItem[] = [];

    // 1) Approvals pending
    for (const inv of invoices) {
      if (inv.status !== "draft") continue;
      const sendMeta = (inv.sendMeta as Record<string, any>) || {};
      const automation = sendMeta.automation || {};
      if (automation.approvalStatus === "PENDING") {
        queue.push({
          id: `approval-${inv.id}`,
          type: "approval",
          priority: 1,
          title: `Approval needed: #${inv.number}`,
          description: `${inv.client?.name || "Unknown client"} is waiting for approval`,
          ctaLabel: "Review & approve",
          ctaHref: `/invoices/new?id=${inv.id}`,
        });
      }
    }

    // 2) Failed schedules
    for (const inv of invoices) {
      if (inv.status !== "draft") continue;
      if (!inv.scheduledSendAt || inv.scheduledSendAt >= now) continue;
      const sendMeta = (inv.sendMeta as Record<string, any>) || {};
      if (sendMeta.error) {
        queue.push({
          id: `failed-${inv.id}`,
          type: "failed_schedule",
          priority: 2,
          title: `Scheduled send failed: #${inv.number}`,
          description: `${inv.client?.name || "Unknown client"} • ${String(sendMeta.error)}`,
          ctaLabel: "Fix and resend",
          ctaHref: `/invoices/new?id=${inv.id}`,
        });
      }
    }

    // 3) Overdue with no reminder in 7 days
    for (const inv of invoices) {
      if (!inv.dueDate) continue;
      if (!["sent", "scheduled", "overdue"].includes(inv.status)) continue;
      if (inv.dueDate >= now) continue;
      if (sentRecentlySet.has(inv.id)) continue;
      queue.push({
        id: `overdue-${inv.id}`,
        type: "overdue_no_reminder",
        priority: 3,
        title: `Overdue without recent follow-up: #${inv.number}`,
        description: `${inv.client?.name || "Unknown client"} • due ${inv.dueDate.toLocaleDateString("en-IN")}`,
        ctaLabel: "Send reminder",
        ctaHref: `/invoices/new?id=${inv.id}`,
      });
    }

    // 4) Draft due soon not sent
    for (const inv of invoices) {
      if (inv.status !== "draft" || !inv.dueDate) continue;
      if (inv.dueDate < now || inv.dueDate > threeDaysOut) continue;
      queue.push({
        id: `draft-soon-${inv.id}`,
        type: "draft_due_soon",
        priority: 4,
        title: `Draft due soon: #${inv.number}`,
        description: `${inv.client?.name || "Unknown client"} • due ${inv.dueDate.toLocaleDateString("en-IN")}`,
        ctaLabel: "Send now",
        ctaHref: `/invoices/new?id=${inv.id}`,
      });
    }

    const actionQueue = queue.sort((a, b) => a.priority - b.priority).slice(0, 12);

    // KPI calculations
    const outstandingInvoices = invoices.filter((i) =>
      ["sent", "scheduled", "overdue"].includes(i.status)
    );
    const overdueInvoices = invoices.filter(
      (i) => i.dueDate && i.dueDate < now && ["sent", "scheduled", "overdue"].includes(i.status)
    );
    const paidRecent = invoices.filter(
      (i) => i.status === "paid" && i.updatedAt >= ninetyDaysAgo && i.issueDate
    );
    const paidMtd = invoices.filter((i) => i.status === "paid" && i.updatedAt >= monthStart);

    const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const balanceDueAmount = outstandingInvoices.reduce(
      (sum, i) => sum + Math.max(0, Number(i.total || 0) - Number(i.amountPaid || 0)),
      0
    );
    const partialPaymentsAmount = outstandingInvoices.reduce(
      (sum, i) => sum + Number(i.amountPaid || 0),
      0
    );
    const overdueAmount = overdueInvoices.reduce(
      (sum, i) => sum + Math.max(0, Number(i.total || 0) - Number(i.amountPaid || 0)),
      0
    );
    const collectedMtd = paidMtd.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const collectedAllTime = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total || 0), 0);
    const avgDaysToPay =
      paidRecent.length === 0
        ? 0
        : paidRecent.reduce((sum, i) => {
            const issue = i.issueDate!;
            const days = (i.updatedAt.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24);
            return sum + Math.max(0, days);
          }, 0) / paidRecent.length;

    const atRiskCount = actionQueue.filter(
      (q) => q.type === "failed_schedule" || q.type === "overdue_no_reminder"
    ).length;

    const countByStatus = (status: string) => invoices.filter((i) => i.status === status).length;
    const pipelineCounts = {
      draft: countByStatus("draft"),
      scheduled: countByStatus("scheduled"),
      sent: countByStatus("sent"),
      paid: countByStatus("paid"),
      overdue: countByStatus("overdue"),
    };

    const sent7d = reminderStats7d.find((s) => s.status === "sent")?._count.id || 0;
    const failed7d = reminderStats7d.find((s) => s.status === "failed")?._count.id || 0;
    const total7d = sent7d + failed7d;
    const successRate7d = total7d === 0 ? 100 : Math.round((sent7d / total7d) * 100);

    const dueScheduledInvoices24h = invoices.filter(
      (i) =>
        i.status === "scheduled" &&
        i.scheduledSendAt &&
        i.scheduledSendAt >= now &&
        i.scheduledSendAt <= next24h
    ).length;
    const dueNext24h = dueReminderSteps24h + dueScheduledInvoices24h;

    return NextResponse.json({
      actionQueue,
      kpis: {
        outstandingAmount,
        balanceDueAmount,
        collectedMtd,
        collectedAllTime,
        partialPaymentsAmount,
        overdueAmount,
        avgDaysToPay,
        atRiskCount,
      },
      pipelineCounts,
      automationHealth: {
        successRate7d,
        failedJobs24h,
        dueNext24h,
        remindersSent7d: sent7d,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_OVERVIEW_V2]", error);
    return NextResponse.json({ error: "Failed to fetch dashboard overview" }, { status: 500 });
  }
}
