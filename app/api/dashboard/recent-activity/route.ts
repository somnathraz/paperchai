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

    // Use ensureActiveWorkspace for consistent security
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      // Return empty activities if workspace not ready yet
      return NextResponse.json({ success: true, activities: [] });
    }
    const workspaceId = workspace.id;

    // Fetch recent invoices, clients, and reminder history in parallel
    const [recentInvoices, recentClients, recentReminders] = await Promise.all([
      prisma.invoice.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { client: true },
      }),
      prisma.client.findMany({
        where: { workspaceId },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.reminderHistory.findMany({
        where: { workspaceId },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: { select: { number: true, id: true, total: true, currency: true } },
          client: { select: { name: true } },
        },
      }),
    ]);

    // Combine into a single activity feed
    const activities = [
      // Invoice activities
      ...recentInvoices.map((inv: any) => ({
        id: `invoice-${inv.id}`,
        type: inv.status === "paid" ? "payment" : "invoice",
        title:
          inv.status === "paid"
            ? `Payment received for #${inv.number}`
            : `Invoice #${inv.number} ${inv.status.toLowerCase()}`,
        description: `${inv.client.name} • ${new Intl.NumberFormat("en-IN", { style: "currency", currency: inv.currency }).format(Number(inv.total))}`,
        timestamp: inv.updatedAt,
        entityId: inv.id,
        entityType: "invoice",
      })),
      // Client activities
      ...recentClients.map((client: any) => ({
        id: `client-${client.id}`,
        type: "client",
        title: `New client added`,
        description: client.name,
        timestamp: client.createdAt,
        entityId: client.id,
        entityType: "client",
      })),
      // Reminder activities (automation runs)
      ...recentReminders.map((reminder: any) => ({
        id: `reminder-${reminder.id}`,
        type:
          reminder.status === "sent"
            ? "reminder_sent"
            : reminder.status === "failed"
              ? "reminder_failed"
              : "reminder",
        title:
          reminder.status === "sent"
            ? `${reminder.channel === "whatsapp" ? "WhatsApp" : "Email"} reminder sent`
            : reminder.status === "failed"
              ? `Reminder failed`
              : `Reminder scheduled`,
        description: reminder.client?.name
          ? `${reminder.client.name}${reminder.invoice?.number ? ` • #${reminder.invoice.number}` : ""}`
          : reminder.invoice?.number || "Unknown",
        timestamp: reminder.createdAt,
        entityId: reminder.invoice?.id || reminder.id,
        entityType: "invoice",
        channel: reminder.channel,
        status: reminder.status,
      })),
    ]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("[RECENT_ACTIVITY_GET]", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
