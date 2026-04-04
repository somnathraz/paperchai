import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);

    if (!workspace) {
      return new NextResponse("No active workspace found", { status: 400 });
    }

    const workspaceId = workspace.id;
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const nextWindow = addDays(now, 45);

    // 1. Fetch today's reminder queue from reminder steps (source of truth)
    const queueSteps = await prisma.invoiceReminderStep.findMany({
      where: {
        schedule: {
          workspaceId,
          enabled: true,
          invoice: {
            remindersEnabled: true,
            status: { notIn: ["paid", "cancelled"] },
          },
        },
        sendAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["PENDING", "PROCESSING", "FAILED", "SENT"] },
      },
      include: {
        schedule: {
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ sendAt: "asc" }, { index: "asc" }],
      take: 50,
    });

    // 2. Fetch upcoming reminder steps for calendar view (next 45 days)
    const upcomingSteps = await prisma.invoiceReminderStep.findMany({
      where: {
        schedule: {
          workspaceId,
          enabled: true,
          invoice: {
            remindersEnabled: true,
            status: { notIn: ["paid", "cancelled"] },
          },
        },
        sendAt: { gte: todayStart, lte: nextWindow },
        status: { in: ["PENDING", "PROCESSING", "FAILED"] },
      },
      include: {
        schedule: {
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                total: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ sendAt: "asc" }, { index: "asc" }],
      take: 500,
    });

    // 3. Reminder Health Stats (from ReminderHistory, last 30d)
    const stats = await prisma.reminderHistory.groupBy({
      by: ["status"],
      where: {
        workspaceId,
        createdAt: {
          gte: addDays(new Date(), -30), // Last 30 days
        },
      },
      _count: {
        id: true,
      },
    });

    const sentCount = stats.find((s) => s.status === "sent")?._count.id || 0;
    const failedCount = stats.find((s) => s.status === "failed")?._count.id || 0;
    const totalCount = sentCount + failedCount;
    const deliveryRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

    // 4. Fetch failures from actual reminder step failures
    const failedSteps = await prisma.invoiceReminderStep.findMany({
      where: {
        status: "FAILED",
        schedule: {
          workspaceId,
        },
      },
      include: {
        schedule: {
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const failures = failedSteps.map((step) => ({
      id: step.id,
      stepId: step.id,
      invoiceId: step.schedule.invoice.id,
      invoiceNumber: step.schedule.invoice.number || step.schedule.invoice.id,
      title: `Invoice #${step.schedule.invoice.number || "Unknown"} - Failed`,
      reason: step.lastError || "Reminder delivery failed",
      client: step.schedule.invoice.client?.name || "Unknown",
      type: "delivery_failed",
      status: step.status.toLowerCase(),
      occurredAt: step.updatedAt,
    }));

    const upcomingByDate = new Map<
      string,
      {
        date: string;
        invoices: Array<{
          id: string;
          invoiceId: string;
          client: string;
          amount: number;
          status: string;
          stepId: string;
        }>;
      }
    >();
    for (const step of upcomingSteps) {
      const iso = step.sendAt.toISOString();
      const key = iso.slice(0, 10);
      const bucket = upcomingByDate.get(key) || { date: iso, invoices: [] };
      bucket.invoices.push({
        id: step.schedule.invoice.number || step.schedule.invoice.id,
        invoiceId: step.schedule.invoice.id,
        client: step.schedule.invoice.client.name,
        amount: Number(step.schedule.invoice.total),
        status: step.status.toLowerCase(),
        stepId: step.id,
      });
      upcomingByDate.set(key, bucket);
    }

    return NextResponse.json({
      queue: queueSteps.map((step) => ({
        id: step.id,
        stepId: step.id,
        invoiceId: step.schedule.invoice.id,
        invoiceNumber: step.schedule.invoice.number || step.schedule.invoice.id,
        client: step.schedule.invoice.client.name,
        type:
          step.daysBeforeDue && step.daysBeforeDue > 0
            ? `${step.daysBeforeDue}d before due`
            : step.daysAfterDue && step.daysAfterDue > 0
              ? `${step.daysAfterDue}d after due`
              : "Due date reminder",
        channel: "email",
        status: step.status.toLowerCase(),
        time: step.sendAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sendAt: step.sendAt.toISOString(),
      })),
      upcoming: Array.from(upcomingByDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
      health: {
        deliveryRate,
        failedCount,
        openRate: null,
      },
      failures,
    });
  } catch (error) {
    console.error("[REMINDERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
