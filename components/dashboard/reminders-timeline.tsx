import { BellDot, Clock3, Mail, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function statusColor(status: string) {
  if (status === "Live") return "bg-emerald-100 text-emerald-700";
  if (status === "Scheduled") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function channelIcon(channel: string) {
  if (channel.includes("WhatsApp") && channel.includes("Email")) return BellDot;
  if (channel.includes("WhatsApp")) return MessageCircle;
  return Mail;
}

export async function RemindersTimeline() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const remindersRaw = await prisma.reminderHistory.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { sentAt: "desc" },
    take: 10,
    include: {
      client: { select: { name: true } },
      invoice: { select: { total: true, currency: true } },
    },
  });

  const reminders = remindersRaw.map((r) => {
    const channel =
      r.channel === "both" ? "Email + WhatsApp" : r.channel === "whatsapp" ? "WhatsApp" : "Email";
    let status = "Pending";
    if (r.kind === "schedule") status = "Scheduled";
    if (r.kind === "send") status = "Live";
    const amount = r.invoice?.total
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: r.invoice.currency || "INR",
          maximumFractionDigits: 0,
        }).format(Number(r.invoice.total))
      : "—";
    const time = r.sentAt ? r.sentAt.toLocaleString() : "—";
    return {
      id: r.id,
      client: r.client?.name || "Client",
      status,
      channel,
      amount,
      time,
    };
  });

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reminders</p>
          <h2 className="text-xl font-semibold">Today&apos;s queue</h2>
        </div>
        <Clock3 className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-5 space-y-4">
        {reminders.map((item) => {
          const Icon = channelIcon(item.channel);
          return (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-inner">
              <div className={`h-full w-1 rounded-full ${item.status === "Live" ? "bg-emerald-400" : item.status === "Scheduled" ? "bg-amber-400" : "bg-slate-300"}`} />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 via-primary/25 to-emerald-400/40 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.client}</p>
                <p className="text-xs text-muted-foreground">{item.channel}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusColor(item.status)}`}>{item.status}</span>
                  <span className="text-sm font-semibold text-foreground">{item.amount}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary/70" />
                  {item.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
