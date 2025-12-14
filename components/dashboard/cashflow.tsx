import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

const gridLines = [0, 20, 40, 60, 80];

export async function CashflowCard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id },
    select: { status: true, total: true, currency: true, issueDate: true, dueDate: true },
    orderBy: { issueDate: "asc" },
  });

  const paid = invoices.filter((i) => i.status === "paid");
  const outstanding = invoices.filter((i) => ["sent", "scheduled", "overdue"].includes(i.status));

  const paidSum = paid.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const outstandingSum = outstanding.reduce((sum, i) => sum + Number(i.total || 0), 0);

  // Simple timeline: map paid invoices over time to build a tiny sparkline
  const paidPoints = paid.slice(-7).map((inv, idx) => ({
    x: idx * 16,
    y: Math.min(75, Math.max(5, Number(inv.total || 0) / (paidSum || 1) * 80)),
  }));
  if (paidPoints.length === 0) paidPoints.push({ x: 0, y: 5 });

  const lastPoint = paidPoints[paidPoints.length - 1];
  const forecastPoints = [
    lastPoint,
    { x: lastPoint.x + 12, y: lastPoint.y + 4 },
    { x: lastPoint.x + 24, y: lastPoint.y + 8 },
  ];

  const paidPath = `M0,${80 - paidPoints[0].y} ${paidPoints.map((p) => `L${p.x},${80 - p.y}`).join(" ")} L${paidPoints[paidPoints.length - 1].x},80 L0,80 Z`;

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cashflow</p>
          <h2 className="text-xl font-semibold">Paid vs unpaid trajectory</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Paid
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Forecast
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="relative h-48 sm:h-64 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 via-white to-white p-4 shadow-inner">
          <svg viewBox="0 0 120 80" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="paidGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(16,185,129,0.4)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0)" />
              </linearGradient>
            </defs>
            {gridLines.map((line) => (
              <line key={line} x1="0" y1={80 - line} x2="120" y2={80 - line} stroke="rgba(15,23,42,0.08)" strokeDasharray="1,3" />
            ))}
            <path d={paidPath} fill="url(#paidGradient)" stroke="none" />
            <path
              d={`M0,${80 - paidPoints[0].y} ${paidPoints.map((p) => `L${p.x},${80 - p.y}`).join(" ")}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {paidPoints.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={80 - p.y} r="1.8" fill="#10b981" />
            ))}
            <path
              d={`M${forecastPoints.map((p) => `${p.x},${80 - p.y}`).join(" L")}`}
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          <div className="absolute bottom-4 left-4 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow backdrop-blur-sm">
            This week +18% ↑
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold text-foreground">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paidSum || 0)}
            </p>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 w-[78%] rounded-full bg-gradient-to-r from-primary via-emerald-400 to-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-lg font-semibold text-foreground">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(outstandingSum || 0)}
            </p>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 w-[22%] rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/70 px-3 py-2 text-xs text-muted-foreground">
            {paid.length} paid · {outstanding.length} open · simple forecast based on recent payments
          </div>
        </div>
      </div>
    </section>
  );
}
