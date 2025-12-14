
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { activeWorkspaceId: true }
        });

        if (!user?.activeWorkspaceId) {
            return new NextResponse("No active workspace", { status: 400 });
        }

        const workspaceId = user.activeWorkspaceId;

        // Fetch recent invoices
        const recentInvoices = await prisma.invoice.findMany({
            where: { workspaceId },
            take: 5,
            orderBy: { updatedAt: "desc" },
            include: { client: true },
        });

        // Fetch recent clients
        const recentClients = await prisma.client.findMany({
            where: { workspaceId },
            take: 3,
            orderBy: { createdAt: "desc" },
        });

        // Combine into a single activity feed
        const activities = [
            ...recentInvoices.map((inv: any) => ({
                id: inv.id,
                type: inv.status === 'paid' ? 'payment' : 'invoice',
                title: inv.status === 'paid' ? `Payment received for #${inv.number}` : `Invoice #${inv.number} ${inv.status.toLowerCase()}`,
                description: `${inv.client.name} • ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency }).format(Number(inv.total))}`,
                timestamp: inv.updatedAt,
                entityId: inv.id,
            })),
            ...recentClients.map((client: any) => ({
                id: client.id,
                type: 'client',
                title: `New client added`,
                description: client.name,
                timestamp: client.createdAt,
                entityId: client.id,
            }))
        ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);

        return NextResponse.json(activities);
    } catch (error) {
        console.error("[RECENT_ACTIVITY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
