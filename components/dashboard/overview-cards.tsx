import { TrendingUp, Timer, ShieldCheck, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function formatCurrency(value: number, currency = "INR") {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    values = [0, 0, 0, 0, 0];
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const path = values
    .map((value, idx) => {
      const normY = ((value - min) / (max - min || 1)) * 40;
      const x = (idx / (values.length - 1 || 1)) * 100;
      const y = 40 - normY + 2;
      return `${idx === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 42" className="mt-3 h-16 w-full text-primary/60">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export async function OverviewCards() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

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

  // Calculate average payout time (from issueDate to updatedAt for paid invoices)
  const paidWithDates = paidInvoices.filter((i) => i.issueDate);
  const avgPayoutDays =
    paidWithDates.length > 0
      ? paidWithDates.reduce((sum, inv) => {
        const diff = (inv.updatedAt.getTime() - inv.issueDate!.getTime()) / (1000 * 60 * 60 * 24);
        return sum + Math.max(diff, 0);
      }, 0) / paidWithDates.length
      : null;

  // Calculate reliability average
  const reliabilityAvg =
    clients.length > 0
      ? clients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / clients.length
      : null;

  // Generate sparklines from recent data (last 5 periods)
  // For collected: last 5 paid invoices
  const collectedSparkline = paidInvoices
    .slice(-5)
    .map((inv) => Math.min(100, (Number(inv.total || 0) / Math.max(collected, 1)) * 100));

  // For outstanding: last 5 outstanding invoices
  const outstandingSparkline = outstandingInvoices
    .slice(-5)
    .map((inv) => Math.min(100, (Number(inv.total || 0) / Math.max(outstanding, 1)) * 100));

  // For payout time: last 5 paid invoices' payout days
  const payoutSparkline = paidWithDates
    .slice(-5)
    .map((inv) => {
      const diff = (inv.updatedAt.getTime() - inv.issueDate!.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.min(20, diff));
    });

  // For reliability: last 5 clients' scores
  const reliabilitySparkline = clients
    .slice(-5)
    .map((c) => c.reliabilityScore ?? 0);

  // Calculate month-over-month change for collected
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthPaid = paidInvoices.filter(
    (i) => i.updatedAt >= thisMonth
  ).reduce((sum, i) => sum + Number(i.total || 0), 0);
  const lastMonthPaid = paidInvoices.filter(
    (i) => i.updatedAt >= lastMonth && i.updatedAt < thisMonth
  ).reduce((sum, i) => sum + Number(i.total || 0), 0);
  const collectedDelta =
    lastMonthPaid > 0
      ? `+${Math.round(((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100)}% this month`
      : collected > 0
        ? "This month"
        : "No data";

  const cards = [
    {
      label: "Collected",
      value: formatCurrency(collected),
      delta: collectedDelta,
      icon: Wallet,
      sparkline: collectedSparkline.length > 0 ? collectedSparkline : [0, 0, 0, 0, 0],
      gradient: "from-primary/20 via-primary/10 to-white",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding),
      delta: `${outstandingInvoices.length} invoices`,
      icon: TrendingUp,
      sparkline: outstandingSparkline.length > 0 ? outstandingSparkline : [0, 0, 0, 0, 0],
      gradient: "from-amber-200/40 via-white to-white",
    },
    {
      label: "Avg payout time",
      value: avgPayoutDays ? `${avgPayoutDays.toFixed(1)} days` : "—",
      delta: avgPayoutDays ? (avgPayoutDays < 10 ? "Fast" : avgPayoutDays < 20 ? "Average" : "Slow") : "No data",
      icon: Timer,
      sparkline: payoutSparkline.length > 0 ? payoutSparkline : [0, 0, 0, 0, 0],
      gradient: "from-indigo-200/40 via-white to-white",
    },
    {
      label: "Reliability",
      value: reliabilityAvg ? `${Math.round(reliabilityAvg)}%` : "—",
      delta: reliabilityAvg ? (reliabilityAvg >= 85 ? "Excellent" : reliabilityAvg >= 70 ? "Good" : "Needs attention") : "No data",
      icon: ShieldCheck,
      sparkline: reliabilitySparkline.length > 0 ? reliabilitySparkline : [0, 0, 0, 0, 0],
      gradient: "from-emerald-200/40 via-white to-white",
    },
  ];

  return (
    <section className="w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br ${card.gradient} px-4 py-3 shadow-[0_20px_80px_-60px_rgba(15,23,42,0.6)] backdrop-blur-xl transition hover:shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.delta}</p>
              </div>
              <div className="rounded-full bg-white/60 p-2 text-primary shadow-inner shrink-0">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <Sparkline values={card.sparkline} />
          </div>
        ))}
      </div>
    </section>
  );
}
