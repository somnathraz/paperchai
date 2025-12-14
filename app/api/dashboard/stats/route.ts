
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Fetch invoices
        const invoices = await prisma.invoice.findMany({
            where: { workspaceId: workspace.id },
            select: { status: true, total: true, issueDate: true, updatedAt: true },
            orderBy: { issueDate: "desc" },
        });

        // Fetch clients for reliability
        const clients = await prisma.client.findMany({
            where: { workspaceId: workspace.id },
            select: { reliabilityScore: true },
        });

        // Calculate collected (paid invoices)
        const paidInvoices = invoices.filter((i) => i.status === "paid");
        const collected = paidInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);

        // Calculate outstanding (sent/scheduled/overdue)
        const outstandingInvoices = invoices.filter((i) => ["sent", "scheduled", "overdue"].includes(i.status));
        const outstanding = outstandingInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);

        // Calculate average payout time
        const paidWithDates = paidInvoices.filter((i) => i.issueDate);
        const avgPayoutDays =
            paidWithDates.length > 0
                ? paidWithDates.reduce((sum, inv) => {
                    const diff = (inv.updatedAt.getTime() - inv.issueDate!.getTime()) / (1000 * 60 * 60 * 24);
                    return sum + Math.max(diff, 0);
                }, 0) / paidWithDates.length
                : 0;

        // Calculate reliability average
        const reliabilityAvg =
            clients.length > 0
                ? clients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / clients.length
                : 0;

        // Generate sparklines
        const collectedSparkline = paidInvoices
            .slice(-5)
            .map((inv) => Math.min(100, (Number(inv.total || 0) / Math.max(collected, 1)) * 100));

        const outstandingSparkline = outstandingInvoices
            .slice(-5)
            .map((inv) => Math.min(100, (Number(inv.total || 0) / Math.max(outstanding, 1)) * 100));

        const payoutSparkline = paidWithDates
            .slice(-5)
            .map((inv) => {
                const diff = (inv.updatedAt.getTime() - inv.issueDate!.getTime()) / (1000 * 60 * 60 * 24);
                return Math.max(0, Math.min(20, diff));
            });

        const reliabilitySparkline = clients
            .slice(-5)
            .map((c) => c.reliabilityScore ?? 0);

        // Month-over-month calculation
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthPaid = paidInvoices.filter(
            (i) => i.updatedAt >= thisMonth
        ).reduce((sum, i) => sum + Number(i.total || 0), 0);
        const lastMonthPaid = paidInvoices.filter(
            (i) => i.updatedAt >= lastMonth && i.updatedAt < thisMonth
        ).reduce((sum, i) => sum + Number(i.total || 0), 0);

        // Construct response object matching DashboardStats type approximately
        // Note: The frontend expects specific structures for cards, but we'll return raw data 
        // and let the frontend format it, OR return the formatted card data. 
        // For "Gold Standard" separation of concerns, API should return raw data, Frontend handles formatting.
        // However, to match the existing logic quickly, we'll return the computed values.

        const stats = {
            totalRevenue: collected,
            pendingInvoices: outstandingInvoices.length,
            overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
            activeClients: clients.length,
            averagePaymentTime: avgPayoutDays,
            reliability: reliabilityAvg,

            // Extended data for Sparklines/Cards
            outstandingAmount: outstanding,
            collectedSparkline: collectedSparkline.length > 0 ? collectedSparkline : [0, 0, 0, 0, 0],
            outstandingSparkline: outstandingSparkline.length > 0 ? outstandingSparkline : [0, 0, 0, 0, 0],
            payoutSparkline: payoutSparkline.length > 0 ? payoutSparkline : [0, 0, 0, 0, 0],
            reliabilitySparkline: reliabilitySparkline.length > 0 ? reliabilitySparkline : [0, 0, 0, 0, 0],

            thisMonthPaid,
            lastMonthPaid
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
    }
}
