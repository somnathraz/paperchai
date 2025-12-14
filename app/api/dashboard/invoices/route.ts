
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
            include: { client: { select: { name: true } } },
            orderBy: { updatedAt: "desc" },
            take: 8,
        });

        const recentInvoices = invoices.map((inv) => {
            const due = inv.dueDate ? new Date(inv.dueDate) : null;
            let dueLabel = "—";
            if (due) {
                const diff = Math.floor((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (diff === 0) dueLabel = "Today";
                else if (diff > 0) dueLabel = `Due in ${diff}d`;
                else dueLabel = `${Math.abs(diff)}d ago`;
            }

            const channels: string[] = [];
            if (inv.deliveryChannel === "email") channels.push("Email");
            else if (inv.deliveryChannel === "whatsapp") channels.push("WhatsApp");
            else if (inv.deliveryChannel === "both") channels.push("Email", "WhatsApp");

            // Map internal status to display
            const statusMap: Record<string, string> = {
                draft: "Draft",
                scheduled: "Scheduled",
                sent: "Sent",
                paid: "Paid",
                overdue: "Overdue",
            };

            return {
                id: inv.id,
                number: inv.number,
                client: inv.client?.name || "—",
                amount: inv.total ? new Intl.NumberFormat("en-IN", { style: "currency", currency: inv.currency || "INR", maximumFractionDigits: 0 }).format(typeof inv.total === 'object' ? Number(inv.total) : inv.total) : "—",
                status: statusMap[inv.status] || inv.status,
                due: dueLabel,
                channel: channels.length ? channels : ["Email"],
                displayStatus: inv.status === "paid" ? "Paid" : inv.status === "overdue" ? "Overdue" : inv.status === "sent" ? "Sent" : "Draft"
            };
        });

        return NextResponse.json({ invoices: recentInvoices });

    } catch (error) {
        console.error("Dashboard invoices error:", error);
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}
