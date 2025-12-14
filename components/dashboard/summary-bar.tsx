import { Wallet, Clock3, Target, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function formatCurrency(value?: number | null, currency = "INR") {
  if (!value) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export async function SummaryBar() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const [paidAgg, outstandingAgg, clients] = await Promise.all([
    prisma.invoice.aggregate({
      where: { workspaceId: workspace.id, status: "paid" },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        workspaceId: workspace.id,
        status: { in: ["sent", "scheduled", "overdue"] },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.client.findMany({
      where: { workspaceId: workspace.id },
      select: { reliabilityScore: true },
    }),
  ]);

  // Estimate average payout using issueDate -> updatedAt diff on paid invoices
  const paidWithDates = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id, status: "paid" },
    select: { issueDate: true, updatedAt: true },
    take: 50,
  });
  const avgPayoutDays =
    paidWithDates.length > 0
      ? paidWithDates.reduce((sum, inv) => {
          const diff = (inv.updatedAt.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(diff, 0);
        }, 0) / paidWithDates.length
      : null;

  const reliabilityAvg =
    clients.length > 0
      ? clients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / clients.length
      : null;

  const items = [
    { label: "Collected", value: formatCurrency(Number(paidAgg._sum.total) || 0), sub: "Paid invoices", icon: Wallet },
    {
      label: "Outstanding",
      value: formatCurrency(Number(outstandingAgg._sum.total) || 0),
      sub: `${outstandingAgg._count} open`,
      icon: Target,
    },
    {
      label: "Avg payout",
      value: avgPayoutDays ? `${avgPayoutDays.toFixed(1)} days` : "—",
      sub: "Based on paid invoices",
      icon: Clock3,
    },
    {
      label: "Reliability",
      value: reliabilityAvg ? `${reliabilityAvg.toFixed(0)}%` : "—",
      sub: "Client score avg",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mb-6 mt-4 hidden w-full max-w-full overflow-hidden rounded-3xl border border-white/30 bg-white/80 p-4 shadow-[0_26px_120px_-70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:flex sm:flex-wrap sm:gap-4 sm:mt-0">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 min-w-[260px] sm:min-w-[200px] shrink-0 items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-inner shadow-black/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/30 to-emerald-400/30 text-primary">
            <item.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold leading-tight text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
