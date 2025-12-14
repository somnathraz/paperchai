import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { activeWorkspace: true },
        });

        if (!user || !user.activeWorkspaceId) {
            return new NextResponse("No active workspace found", { status: 400 });
        }

        const workspaceId = user.activeWorkspaceId;
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const last7Days = subDays(new Date(), 7);

        // 1. Pipeline Counts by Status
        const invoiceCounts = await prisma.invoice.groupBy({
            by: ['status'],
            where: { workspaceId },
            _count: { id: true }
        });

        const getCount = (status: string) => invoiceCounts.find(c => c.status === status)?._count.id || 0;

        // 2. Today's Summary
        const todayReminders = await prisma.reminderHistory.count({
            where: {
                workspaceId,
                createdAt: { gte: todayStart, lte: todayEnd },
                kind: 'reminder'
            }
        });

        const todayEmailsSent = await prisma.reminderHistory.count({
            where: {
                workspaceId,
                createdAt: { gte: todayStart, lte: todayEnd },
                status: 'sent'
            }
        });

        const todayPaid = await prisma.invoice.count({
            where: {
                workspaceId,
                status: 'paid',
                updatedAt: { gte: todayStart, lte: todayEnd }
            }
        });

        const todayCreated = await prisma.invoice.count({
            where: {
                workspaceId,
                createdAt: { gte: todayStart, lte: todayEnd }
            }
        });

        // 3. Invoices with reminders count (for pipeline stages)
        const invoicesWithReminders = await prisma.invoice.findMany({
            where: {
                workspaceId,
                status: { in: ['sent', 'overdue'] },
            },
            select: {
                id: true,
                _count: { select: { reminders: true } }
            }
        });

        const reminder1Count = invoicesWithReminders.filter(i => i._count.reminders === 1).length;
        const reminder2Count = invoicesWithReminders.filter(i => i._count.reminders >= 2).length;

        // 4. Upcoming Automations (invoices with scheduled actions)
        const upcomingAutomations = await prisma.invoice.findMany({
            where: {
                workspaceId,
                OR: [
                    { scheduledSendAt: { gte: new Date(), lte: addDays(new Date(), 7) } },
                    {
                        status: 'sent',
                        remindersEnabled: true,
                        dueDate: { gte: new Date(), lte: addDays(new Date(), 7) }
                    }
                ]
            },
            include: { client: { select: { name: true } } },
            orderBy: { scheduledSendAt: 'asc' },
            take: 5
        });

        // 5. Recently Completed (paid in last 7 days)
        const recentlyCompleted = await prisma.invoice.findMany({
            where: {
                workspaceId,
                status: 'paid',
                updatedAt: { gte: last7Days }
            },
            include: { client: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 5
        });

        // 6. Errors (failed reminders + missed schedules)
        const failedReminders = await prisma.reminderHistory.findMany({
            where: {
                workspaceId,
                status: 'failed',
                createdAt: { gte: last7Days }
            },
            include: {
                invoice: { select: { id: true, number: true } },
                client: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const missedSchedules = await prisma.invoice.findMany({
            where: {
                workspaceId,
                status: 'draft',
                scheduledSendAt: { lt: new Date() }
            },
            include: { client: { select: { name: true } } },
            take: 5
        });

        // 7. Revenue Impact
        const revenueStats = await prisma.invoice.aggregate({
            where: {
                workspaceId,
                status: "paid",
                remindersEnabled: true
            },
            _sum: { total: true }
        });

        // 8. Activity Feed (Recent ReminderHistory)
        const recentActivity = await prisma.reminderHistory.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                client: { select: { name: true } },
                invoice: { select: { number: true, id: true } }
            }
        });

        return NextResponse.json({
            todaySummary: {
                emailsSent: todayEmailsSent,
                remindersFired: todayReminders,
                invoicesCreated: todayCreated,
                invoicesPaid: todayPaid,
            },
            pipeline: {
                draft: getCount('draft'),
                scheduled: await prisma.invoice.count({
                    where: { workspaceId, status: 'draft', scheduledSendAt: { not: null } }
                }),
                sent: getCount('sent') - reminder1Count - reminder2Count,
                reminder1: reminder1Count,
                reminder2: reminder2Count,
                overdue: getCount('overdue'),
                paid: getCount('paid'),
            },
            upcomingAutomations: upcomingAutomations.map(inv => ({
                invoiceId: inv.id,
                invoiceNumber: inv.number,
                clientName: inv.client.name,
                action: inv.status === 'draft' ? 'Scheduled Send' : 'Payment Reminder',
                scheduledAt: inv.scheduledSendAt || inv.dueDate,
            })),
            recentlyCompleted: recentlyCompleted.map(inv => ({
                invoiceId: inv.id,
                invoiceNumber: inv.number,
                clientName: inv.client.name,
                completedAt: inv.updatedAt,
                amount: Number(inv.total),
            })),
            errors: [
                ...failedReminders.map(r => ({
                    id: r.id,
                    type: 'delivery_failed',
                    message: `Failed to send reminder for Invoice #${r.invoice?.number || 'Unknown'}`,
                    invoiceId: r.invoice?.id,
                    clientName: r.client?.name || 'Unknown',
                    time: r.createdAt,
                })),
                ...missedSchedules.map(inv => ({
                    id: inv.id,
                    type: 'missed_schedule',
                    message: `Invoice #${inv.number} missed scheduled send`,
                    invoiceId: inv.id,
                    clientName: inv.client.name,
                    time: inv.scheduledSendAt,
                }))
            ].slice(0, 5),
            revenue: {
                totalCollected: Number(revenueStats._sum.total || 0),
                timeSavedHours: Math.round(getCount('paid') * 0.5),
            },
            activity: recentActivity.map(act => ({
                id: act.id,
                type: act.kind || "reminder",
                description: `${act.kind === 'reminder' ? 'Sent reminder to' : 'Action for'} ${act.client?.name}`,
                invoiceId: act.invoice?.id,
                invoiceNumber: act.invoice?.number,
                time: act.createdAt,
                channel: act.channel,
                status: act.status,
            }))
        });

    } catch (error) {
        console.error("[AUTOMATION_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
