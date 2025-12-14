import { Bell, CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function iconFor(type: "reminder" | "invoice" | "reliability", channel?: string) {
  if (type === "reliability") return ShieldCheck;
  if (type === "invoice") return CheckCircle2;
  if (channel?.includes("WhatsApp")) return MessageCircle;
  if (channel?.includes("Email")) return Mail;
  return Bell;
}

export async function ActivityFeed() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const reminders = await prisma.reminderHistory.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { client: { select: { name: true } }, invoice: { select: { number: true, total: true, currency: true } } },
  });
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { number: true, status: true, total: true, currency: true, updatedAt: true },
  });

  const reminderEvents = reminders.map((r) => {
    const channel =
      r.channel === "both" ? "Email + WhatsApp" : r.channel === "whatsapp" ? "WhatsApp" : "Email";
    const Icon = iconFor("reminder", channel);
    const amount =
      r.invoice?.total != null
        ? new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: r.invoice.currency || "INR",
            maximumFractionDigits: 0,
          }).format(Number(r.invoice.total))
        : "";
    return {
      icon: Icon,
      text: `${channel} ${r.kind === "schedule" ? "scheduled" : "sent"} ${r.client?.name || ""} ${r.invoice?.number ? `(${r.invoice.number})` : ""} ${amount}`,
      time: r.createdAt.toLocaleString(),
    };
  });

  const invoiceEvents = invoices.map((inv) => ({
    icon: iconFor("invoice"),
    text: `Invoice ${inv.number} ${inv.status}`,
    time: inv.updatedAt.toLocaleString(),
  }));

  const feed = [...reminderEvents, ...invoiceEvents].slice(0, 8);

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
          <h2 className="text-xl font-semibold">Live pulse</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live</span>
      </div>
      <div className="mt-4 space-y-3">
        {feed.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        )}
        {feed.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-inner">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 via-primary/25 to-emerald-400/40 text-primary">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm text-foreground">
              <p>{item.text}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
