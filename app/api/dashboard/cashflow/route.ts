
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

        const invoices = await prisma.invoice.findMany({
            where: { workspaceId: workspace.id },
            select: { status: true, total: true, currency: true, issueDate: true, dueDate: true },
            orderBy: { issueDate: "asc" },
        });

        const paid = invoices.filter((i) => i.status === "paid");
        const outstanding = invoices.filter((i) => ["sent", "scheduled", "overdue"].includes(i.status));

        const paidSum = paid.reduce((sum, i) => sum + Number(i.total || 0), 0);
        const outstandingSum = outstanding.reduce((sum, i) => sum + Number(i.total || 0), 0);

        // Build timeline points for sparkline
        // This logic mirrors the original component to maintain visual consistency
        const paidPoints = paid.slice(-7).map((inv, idx) => ({
            x: idx * 16,
            y: Math.min(75, Math.max(5, Number(inv.total || 0) / (paidSum || 1) * 80)),
        }));

        if (paidPoints.length === 0) paidPoints.push({ x: 0, y: 5 });

        // Calculate forecast points
        const lastPoint = paidPoints[paidPoints.length - 1];
        const forecastPoints = [
            lastPoint,
            { x: lastPoint.x + 12, y: lastPoint.y + 4 },
            { x: lastPoint.x + 24, y: lastPoint.y + 8 },
        ];

        return NextResponse.json({
            paidSum,
            outstandingSum,
            paidCount: paid.length,
            outstandingCount: outstanding.length,
            paidPoints,
            forecastPoints
        });

    } catch (error) {
        console.error("Dashboard cashflow error:", error);
        return NextResponse.json({ error: "Failed to fetch cashflow data" }, { status: 500 });
    }
}
