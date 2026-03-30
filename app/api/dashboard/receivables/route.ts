import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

const emptyResponse = {
  buckets: {
    dueTodayAmount: 0,
    dueThisWeekAmount: 0,
    overdueAmount: 0,
    partialPaidAmount: 0,
  },
  expectedInflow: {
    next7Days: 0,
    next30Days: 0,
  },
  stateCounts: {
    draft: 0,
    scheduled: 0,
    sent: 0,
    overdue: 0,
    partialPaid: 0,
    paid: 0,
  },
  businessCounts: {
    activeClients: 0,
    activeProjects: 0,
    completedProjects: 0,
  },
  receivables: [] as Array<{
    id: string;
    clientId: string | null;
    number: string;
    clientName: string;
    dueDate: string | null;
    status: string;
    total: number;
    amountPaid: number;
    balanceDue: number;
    riskLabel: string;
    remindersReady: boolean;
  }>,
  topClients: [] as Array<{
    id: string;
    name: string;
    outstanding: number;
    balanceDue: number;
    overdueCount: number;
    openInvoiceCount: number;
    reliabilityScore: number | null;
    averageDelayDays: number | null;
    trend: number[];
  }>,
  projectPipeline: [] as Array<{
    id: string;
    name: string;
    clientId: string | null;
    clientName: string;
    status: string;
    readyToInvoiceAmount: number;
    invoicedAmount: number;
    paidAmount: number;
    pendingMilestones: number;
    nextMilestoneLabel: string;
  }>,
  cashflowSummary: {
    headline: "No receivables yet",
    summary:
      "Create and send invoices to start tracking what is due, what is at risk, and what is already collected.",
    insights: [] as string[],
    recommendations: [] as string[],
  },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json(emptyResponse);
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [invoices, clients, projectStats, projects] = await Promise.all([
      prisma.invoice.findMany({
        where: { workspaceId: workspace.id },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          amountPaid: true,
          dueDate: true,
          issueDate: true,
          updatedAt: true,
          currency: true,
          remindersEnabled: true,
          reminderSchedule: {
            select: {
              id: true,
              enabled: true,
            },
          },
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
              reliabilityScore: true,
              averageDelayDays: true,
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.client.findMany({
        where: { workspaceId: workspace.id },
        select: {
          id: true,
          name: true,
          reliabilityScore: true,
          averageDelayDays: true,
          outstanding: true,
        },
      }),
      prisma.project.groupBy({
        by: ["status"],
        where: { workspaceId: workspace.id },
        _count: { id: true },
      }),
      prisma.project.findMany({
        where: { workspaceId: workspace.id },
        select: {
          id: true,
          name: true,
          clientId: true,
          status: true,
          nextInvoiceDate: true,
          client: { select: { name: true } },
          milestones: {
            select: {
              id: true,
              title: true,
              amount: true,
              status: true,
              dueDate: true,
              expectedDate: true,
            },
            orderBy: [{ dueDate: "asc" }, { expectedDate: "asc" }],
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const openStatuses = ["sent", "scheduled", "overdue"];
    const openInvoices = invoices.filter((invoice) => openStatuses.includes(invoice.status));
    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");

    const receivables = openInvoices
      .map((invoice) => {
        const total = Number(invoice.total || 0);
        const amountPaid = Number(invoice.amountPaid || 0);
        const balanceDue = Math.max(0, total - amountPaid);
        const isOverdue = Boolean(invoice.dueDate && invoice.dueDate < now && balanceDue > 0);
        const isPartialPaid = amountPaid > 0 && balanceDue > 0;
        const riskLabel = isOverdue
          ? "Overdue"
          : isPartialPaid
            ? "Partial paid"
            : invoice.dueDate && invoice.dueDate <= sevenDaysOut
              ? "Due soon"
              : "Healthy";

        return {
          id: invoice.id,
          clientId: invoice.clientId || null,
          number: invoice.number,
          clientName: invoice.client?.name || "Unknown client",
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          status: isPartialPaid ? "partial_paid" : invoice.status,
          total,
          amountPaid,
          balanceDue,
          riskLabel,
          remindersReady:
            Boolean(invoice.remindersEnabled) &&
            Boolean(invoice.reminderSchedule?.id) &&
            Boolean(invoice.reminderSchedule?.enabled),
        };
      })
      .filter((invoice) => invoice.balanceDue > 0)
      .sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });

    const dueTodayAmount = receivables
      .filter((invoice) => {
        if (!invoice.dueDate) return false;
        const due = new Date(invoice.dueDate);
        return due >= startOfToday && due <= endOfToday;
      })
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const dueThisWeekAmount = receivables
      .filter((invoice) => {
        if (!invoice.dueDate) return false;
        const due = new Date(invoice.dueDate);
        return due > endOfToday && due <= sevenDaysOut;
      })
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const overdueAmount = receivables
      .filter((invoice) => invoice.dueDate && new Date(invoice.dueDate) < now)
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const partialPaidAmount = receivables
      .filter((invoice) => invoice.status === "partial_paid")
      .reduce((sum, invoice) => sum + invoice.amountPaid, 0);

    const expectedInflowNext7Days = receivables
      .filter((invoice) => {
        if (!invoice.dueDate) return false;
        const due = new Date(invoice.dueDate);
        return due >= now && due <= sevenDaysOut;
      })
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const expectedInflowNext30Days = receivables
      .filter((invoice) => {
        if (!invoice.dueDate) return false;
        const due = new Date(invoice.dueDate);
        return due >= now && due <= thirtyDaysOut;
      })
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const stateCounts = {
      draft: invoices.filter((invoice) => invoice.status === "draft").length,
      scheduled: invoices.filter((invoice) => invoice.status === "scheduled").length,
      sent: invoices.filter((invoice) => invoice.status === "sent").length,
      overdue: invoices.filter((invoice) => invoice.status === "overdue").length,
      partialPaid: receivables.filter((invoice) => invoice.status === "partial_paid").length,
      paid: paidInvoices.length,
    };

    const businessCounts = {
      activeClients: clients.length,
      activeProjects: projectStats.find((entry) => entry.status === "ACTIVE")?._count.id || 0,
      completedProjects: projectStats.find((entry) => entry.status === "COMPLETED")?._count.id || 0,
    };

    const topClients = clients
      .map((client) => {
        const clientInvoices = receivables.filter((invoice) => invoice.clientId === client.id);
        const overdueCount = clientInvoices.filter(
          (invoice) => invoice.dueDate && new Date(invoice.dueDate) < now
        ).length;
        const balanceDue = clientInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
        const trend = buildClientTrend(invoices, client.id);
        return {
          id: client.id,
          name: client.name,
          outstanding: Number(client.outstanding || 0),
          balanceDue,
          overdueCount,
          openInvoiceCount: clientInvoices.length,
          reliabilityScore: client.reliabilityScore ?? null,
          averageDelayDays: client.averageDelayDays ?? null,
          trend,
        };
      })
      .filter((client) => client.balanceDue > 0 || client.openInvoiceCount > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue || b.overdueCount - a.overdueCount)
      .slice(0, 5);

    const projectPipeline = projects.map((project) => {
      const readyToInvoiceAmount = project.milestones
        .filter((milestone) => milestone.status === "READY_FOR_INVOICE")
        .reduce((sum, milestone) => sum + milestone.amount, 0);
      const invoicedAmount = project.milestones
        .filter((milestone) => milestone.status === "INVOICED")
        .reduce((sum, milestone) => sum + milestone.amount, 0);
      const paidAmount = project.milestones
        .filter((milestone) => milestone.status === "PAID")
        .reduce((sum, milestone) => sum + milestone.amount, 0);
      const pendingMilestones = project.milestones.filter((milestone) =>
        ["PLANNED", "IN_PROGRESS", "READY_FOR_INVOICE"].includes(milestone.status)
      ).length;
      const nextMilestone = project.milestones.find((milestone) =>
        ["PLANNED", "IN_PROGRESS", "READY_FOR_INVOICE"].includes(milestone.status)
      );
      return {
        id: project.id,
        name: project.name,
        clientId: project.clientId || null,
        clientName: project.client?.name || "No client linked",
        status: project.status,
        readyToInvoiceAmount,
        invoicedAmount,
        paidAmount,
        pendingMilestones,
        nextMilestoneLabel: nextMilestone
          ? `${nextMilestone.title} · ${
              nextMilestone.dueDate || nextMilestone.expectedDate
                ? new Date(nextMilestone.dueDate || nextMilestone.expectedDate!).toLocaleDateString(
                    "en-IN"
                  )
                : "No date"
            }`
          : project.nextInvoiceDate
            ? `Next invoice · ${new Date(project.nextInvoiceDate).toLocaleDateString("en-IN")}`
            : "No billing milestone set",
      };
    });

    const biggestExposureClient = topClients[0];
    const slowestClient = topClients
      .filter((client) => client.averageDelayDays != null)
      .sort((a, b) => (b.averageDelayDays || 0) - (a.averageDelayDays || 0))[0];

    const insights: string[] = [];
    const recommendations: string[] = [];

    if (overdueAmount > 0) {
      insights.push(
        `${stateCounts.overdue} overdue invoice${stateCounts.overdue === 1 ? "" : "s"} worth ${formatCurrency(overdueAmount)} still need collection.`
      );
      recommendations.push("Review overdue invoices first and send a firm follow-up today.");
    }

    if (stateCounts.partialPaid > 0) {
      insights.push(
        `${stateCounts.partialPaid} invoice${stateCounts.partialPaid === 1 ? "" : "s"} are partially paid. ${formatCurrency(partialPaidAmount)} is collected, but ${formatCurrency(
          receivables
            .filter((invoice) => invoice.status === "partial_paid")
            .reduce((sum, invoice) => sum + invoice.balanceDue, 0)
        )} is still outstanding.`
      );
      recommendations.push(
        "Use partial-paid invoices as your easiest follow-up queue because intent is already proven."
      );
    }

    if (biggestExposureClient) {
      insights.push(
        `${biggestExposureClient.name} is your largest receivable exposure at ${formatCurrency(biggestExposureClient.balanceDue)} across ${biggestExposureClient.openInvoiceCount} open invoice${biggestExposureClient.openInvoiceCount === 1 ? "" : "s"}.`
      );
    }

    if (slowestClient && (slowestClient.averageDelayDays || 0) > 7) {
      recommendations.push(
        `${slowestClient.name} trends ${slowestClient.averageDelayDays} days late on average. Shorten terms or escalate earlier on the next invoice.`
      );
    }

    if (expectedInflowNext7Days > 0) {
      insights.push(
        `${formatCurrency(expectedInflowNext7Days)} is expected within the next 7 days if due invoices land on time.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Your receivables look healthy. Keep reminders active and watch the due-this-week bucket."
      );
    }

    const headline =
      receivables.length === 0
        ? "No active receivables"
        : overdueAmount > 0
          ? `${formatCurrency(overdueAmount)} is overdue right now`
          : `${formatCurrency(expectedInflowNext7Days || expectedInflowNext30Days || 0)} is expected next`;

    const summary =
      receivables.length === 0
        ? "You do not have any open receivables in this workspace yet."
        : `You have ${receivables.length} open receivable${receivables.length === 1 ? "" : "s"} across ${topClients.length || clients.length} client${(topClients.length || clients.length) === 1 ? "" : "s"}. Balance due stands at ${formatCurrency(
            receivables.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
          )}.`;

    return NextResponse.json({
      buckets: {
        dueTodayAmount,
        dueThisWeekAmount,
        overdueAmount,
        partialPaidAmount,
      },
      expectedInflow: {
        next7Days: expectedInflowNext7Days,
        next30Days: expectedInflowNext30Days,
      },
      stateCounts,
      businessCounts,
      receivables: receivables.slice(0, 8),
      topClients,
      projectPipeline,
      cashflowSummary: {
        headline,
        summary,
        insights,
        recommendations,
      },
    });
  } catch (error) {
    console.error("Dashboard receivables error:", error);
    return NextResponse.json({ error: "Failed to fetch receivables" }, { status: 500 });
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildClientTrend(
  invoices: Array<{
    clientId: string | null;
    status: string;
    total: any;
    updatedAt: Date;
  }>,
  clientId: string
) {
  const months = Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (3 - index));
    return `${date.getFullYear()}-${date.getMonth()}`;
  });

  const totals = months.map((key) => {
    return invoices
      .filter((invoice) => {
        const invoiceKey = `${invoice.updatedAt.getFullYear()}-${invoice.updatedAt.getMonth()}`;
        return invoice.clientId === clientId && invoice.status === "paid" && invoiceKey === key;
      })
      .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  });

  const max = Math.max(...totals, 1);
  return totals.map((value) => Math.max(8, Math.round((value / max) * 100)));
}
