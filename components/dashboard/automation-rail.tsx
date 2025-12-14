import { ArrowRight, Mail, MessageCircle, NotepadText, Slack, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function AutomationRail() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  // Check for recent activity in each category
  const [recentReminders, recentInvoices, scheduledInvoices] = await Promise.all([
    // Check for recent reminders sent
    prisma.reminderHistory.findFirst({
      where: {
        workspaceId: workspace.id,
        kind: "send",
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true, channel: true },
    }),
    // Check for recent invoices sent
    prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.id,
        status: "sent",
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true, deliveryChannel: true },
    }),
    // Check for scheduled invoices
    prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.id,
        status: "scheduled",
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  // Determine status for each step
  const hasRecentReminder = recentReminders && recentReminders.sentAt && 
    (Date.now() - recentReminders.sentAt.getTime()) < 7 * 24 * 60 * 60 * 1000; // Last 7 days
  
  const hasRecentInvoice = recentInvoices && 
    (Date.now() - recentInvoices.updatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000; // Last 7 days
  
  const hasScheduled = scheduledInvoices !== null;

  // Build steps based on actual data
  const steps = [
    {
      title: "Invoice created",
      desc: "Draft or scheduled",
      icon: NotepadText,
      status: hasRecentInvoice || hasScheduled ? "Active" : "Ready",
      tone: hasRecentInvoice || hasScheduled ? "success" as const : "pending" as const,
    },
    {
      title: "Email sent",
      desc: "Invoice delivered",
      icon: Mail,
      status: hasRecentInvoice && (recentInvoices.deliveryChannel === "email" || recentInvoices.deliveryChannel === "both") ? "Sent" : "Ready",
      tone: hasRecentInvoice && (recentInvoices.deliveryChannel === "email" || recentInvoices.deliveryChannel === "both") ? "success" as const : "pending" as const,
    },
    {
      title: "WhatsApp sent",
      desc: "Quick follow-up",
      icon: MessageCircle,
      status: hasRecentReminder && (recentReminders.channel === "whatsapp" || recentReminders.channel === "both") ? "Sent" : "Ready",
      tone: hasRecentReminder && (recentReminders.channel === "whatsapp" || recentReminders.channel === "both") ? "success" as const : "pending" as const,
    },
    {
      title: "Reminders active",
      desc: "Auto-follow-ups",
      icon: Clock,
      status: hasRecentReminder ? "Active" : "Ready",
      tone: hasRecentReminder ? "info" as const : "pending" as const,
    },
  ];

  // Count total automation activity
  const totalInvoices = await prisma.invoice.count({
    where: { workspaceId: workspace.id },
  });
  const totalReminders = await prisma.reminderHistory.count({
    where: { workspaceId: workspace.id },
  });

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation rail</p>
          <h2 className="text-xl font-semibold">Watch the handoff</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {totalInvoices > 0 || totalReminders > 0 ? "Active" : "Ready"}
        </span>
      </div>

      <div className="relative mt-6 flex w-full max-w-full flex-row items-stretch gap-3 overflow-x-auto no-scrollbar sm:gap-4">
        <div className="absolute left-4 right-4 top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent sm:block" />
        {steps.map((step, idx) => (
          <div
            key={step.title}
            className="relative flex min-w-[200px] sm:min-w-[220px] flex-1 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 via-white to-white px-3 py-4 text-center shadow-inner transition hover:-translate-y-0.5 sm:gap-3 sm:px-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/25 to-emerald-400/40 text-primary">
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                step.tone === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : step.tone === "info"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {step.status}
            </span>
            {idx < steps.length - 1 && (
              <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary sm:block" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        {totalInvoices > 0 || totalReminders > 0
          ? `${totalInvoices} invoices · ${totalReminders} reminders sent`
          : "Create your first invoice to start automation"}
        <ArrowRight className="h-4 w-4" />
      </div>
    </section>
  );
}
