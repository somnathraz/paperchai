import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is exported from here, verify path
import { prisma } from "@/lib/prisma"; // Assuming prisma client is here
import { startOfDay, endOfDay, addDays } from "date-fns";

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
        const nextWeek = addDays(new Date(), 45); // Extended to support calendar view

        // 1. Fetch Today's Queue
        // Logic: Invoices that are scheduled to be sent today OR are DUE today/recently and haven't been paid.
        // Also including invoices with 'scheduledSendAt' in the past but status is still 'draft' (missed?)
        const queue = await prisma.invoice.findMany({
            where: {
                workspaceId,
                status: { in: ["draft", "sent", "overdue"] },
                OR: [
                    // Scheduled for today
                    {
                        scheduledSendAt: {
                            gte: todayStart,
                            lte: todayEnd,
                        },
                    },
                    // OR Due today (for reminders)
                    {
                        dueDate: {
                            gte: todayStart,
                            lte: todayEnd,
                        },
                    },
                ],
            },
            include: {
                client: {
                    select: { name: true },
                },
            },
            orderBy: {
                scheduledSendAt: 'asc',
            },
            take: 10,
        });

        // 2. Fetch Upcoming Reminders (Next 45 days) - Include ALL invoices for calendar view
        const upcoming = await prisma.invoice.findMany({
            where: {
                workspaceId,
                OR: [
                    // Invoices with due dates in the range
                    {
                        dueDate: {
                            gte: todayStart,
                            lte: nextWeek
                        }
                    },
                    // Invoices with scheduled send dates in the range
                    {
                        scheduledSendAt: {
                            gte: todayStart,
                            lte: nextWeek
                        }
                    },
                    // Recently sent invoices (last 7 days)
                    {
                        lastSentAt: {
                            gte: addDays(new Date(), -7),
                            lte: new Date()
                        }
                    }
                ]
            },
            include: {
                client: { select: { name: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 100
        });


        // 3. Reminder Health Stats (from ReminderHistory)
        const stats = await prisma.reminderHistory.groupBy({
            by: ['status'],
            where: {
                workspaceId,
                createdAt: {
                    gte: addDays(new Date(), -30) // Last 30 days
                }
            },
            _count: {
                id: true,
            },
        });

        const sentCount = stats.find(s => s.status === 'sent')?._count.id || 0;
        const failedCount = stats.find(s => s.status === 'failed')?._count.id || 0;
        const totalCount = sentCount + failedCount;
        const deliveryRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

        // 4. Fetch Failures (Missed Schedules + Failed Sends)
        const missedInvoices = await prisma.invoice.findMany({
            where: {
                workspaceId,
                status: 'draft',
                scheduledSendAt: { lt: new Date() }
            },
            take: 5,
            include: { client: { select: { name: true } } }
        });

        const failedHistory = await prisma.reminderHistory.findMany({
            where: {
                workspaceId,
                status: 'failed'
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { name: true } },
                invoice: { select: { number: true } }
            }
        });

        const failures = [
            ...missedInvoices.map(inv => ({
                id: inv.id,
                title: `Invoice #${inv.number} - Missed`,
                reason: "Scheduled time passed without sending",
                client: inv.client.name,
                type: "missed_schedule"
            })),
            ...failedHistory.map(hist => ({
                id: hist.id,
                title: `Invoice #${hist.invoice?.number || 'Unknown'} - Failed`,
                reason: "Delivery failed (Check logs)", // Placeholder as no error col
                client: hist.client?.name || "Unknown",
                type: "delivery_failed"
            }))
        ].slice(0, 5);

        return NextResponse.json({
            queue: queue.map(inv => ({
                id: inv.number || inv.id, // Display ID
                invoiceId: inv.id, // Actual ID for API calls
                client: inv.client.name,
                type: inv.status === 'draft' ? "Scheduled Send" : "Payment Reminder",
                channel: inv.deliveryChannel || "email",
                status: inv.scheduledSendAt && inv.scheduledSendAt < new Date() && inv.status === 'draft' ? 'failed' : 'pending',
                time: inv.scheduledSendAt ? new Date(inv.scheduledSendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All Day",
                rawStatus: inv.status
            })),
            upcoming: upcoming.map(inv => ({
                date: inv.dueDate || inv.scheduledSendAt || inv.lastSentAt || new Date(),
                invoices: [{
                    id: inv.number || inv.id,
                    invoiceId: inv.id, // Actual ID for API calls
                    client: inv.client.name,
                    amount: Number(inv.total),
                    status: inv.status
                }]
            })),
            health: {
                deliveryRate,
                failedCount,
                openRate: 68, // distinct read tracking not in schema yet, hardcoding or using approximate
            },
            failures
        });

    } catch (error) {
        console.error("[REMINDERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
