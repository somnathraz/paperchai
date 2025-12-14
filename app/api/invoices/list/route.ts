import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { workspaceId: workspace.id };

    if (statusFilter) {
        const statuses = statusFilter.split(",").map(s => s.trim());
        where.status = { in: statuses };
    }

    if (clientId) {
        where.clientId = clientId;
    }

    const invoices = await prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            number: true,
            status: true,
            total: true,
            currency: true,
            dueDate: true,
            clientId: true,
            remindersEnabled: true,
            client: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return NextResponse.json({
        invoices: invoices.map(inv => ({
            id: inv.id,
            number: inv.number,
            status: inv.status,
            total: inv.total?.toString() || "0",
            currency: inv.currency,
            dueDate: inv.dueDate?.toISOString(),
            clientId: inv.clientId,
            clientName: inv.client?.name,
            remindersEnabled: inv.remindersEnabled,
        })),
    });
}
