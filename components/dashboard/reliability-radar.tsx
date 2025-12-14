import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function ReliabilityRadar() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, reliabilityScore: true, outstanding: true, averageDelayDays: true },
    orderBy: { reliabilityScore: "desc" },
  });

  const buckets = [
    { label: "Reliable", color: "bg-emerald-500", value: clients.filter((c) => (c.reliabilityScore ?? 0) >= 85).length },
    { label: "Sometimes late", color: "bg-amber-400", value: clients.filter((c) => (c.reliabilityScore ?? 0) >= 70 && (c.reliabilityScore ?? 0) < 85).length },
    { label: "High risk", color: "bg-red-500", value: clients.filter((c) => (c.reliabilityScore ?? 0) < 70).length },
  ];

  const topRisks = clients
    .filter((c) => (c.reliabilityScore ?? 0) < 85)
    .sort((a, b) => (a.reliabilityScore ?? 0) - (b.reliabilityScore ?? 0))
    .slice(0, 5);

  const totalScore =
    clients.length > 0 ? clients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / clients.length : 0;

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reliability</p>
          <h2 className="text-xl font-semibold">Risk radar</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI scored</span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-inner lg:flex-row">
          <div className="flex flex-1 items-center justify-center">
            <DonutChart buckets={buckets} totalScore={totalScore} />
          </div>
          <div className="space-y-2 text-sm text-muted-foreground lg:w-48">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${bucket.color}`} />
                  {bucket.label}
                </div>
                <span className="font-semibold text-foreground">{bucket.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Top risky clients</p>
            <span className="text-xs text-muted-foreground">Escalate politely</span>
          </div>
          <div className="mt-3 space-y-2">
            {topRisks.length === 0 && <p className="text-xs text-muted-foreground">No risks detected.</p>}
            {topRisks.map((client) => (
              <div key={client.id} className="flex items-center justify-between rounded-xl border border-white/20 bg-white/70 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">Delay avg · {client.averageDelayDays?.toFixed(1) ?? "—"}d</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {client.reliabilityScore ?? "—"}
                  </span>
                  <span className="font-semibold text-foreground">
                    {client.outstanding != null
                      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                          Number(client.outstanding)
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DonutChart({ buckets, totalScore }: { buckets: { label: string; value: number; color: string }[]; totalScore: number }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0) || 1;
  let cumulative = 0;

  return (
    <svg viewBox="0 0 180 180" className="h-40 w-40">
      {buckets.map((bucket) => {
        const startAngle = (cumulative / total) * Math.PI * 2;
        cumulative += bucket.value;
        const endAngle = (cumulative / total) * Math.PI * 2;
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        const radius = 80;
        const innerRadius = 55;
        const startOuter = {
          x: 90 + radius * Math.cos(startAngle),
          y: 90 + radius * Math.sin(startAngle),
        };
        const endOuter = {
          x: 90 + radius * Math.cos(endAngle),
          y: 90 + radius * Math.sin(endAngle),
        };
        const startInner = {
          x: 90 + innerRadius * Math.cos(endAngle),
          y: 90 + innerRadius * Math.sin(endAngle),
        };
        const endInner = {
          x: 90 + innerRadius * Math.cos(startAngle),
          y: 90 + innerRadius * Math.sin(startAngle),
        };
        const d = `M ${startOuter.x} ${startOuter.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
        return <path key={bucket.label} d={d} className={bucket.color.replace("bg-", "fill-")} />;
      })}
      <circle cx="90" cy="90" r="35" fill="white" />
      <text x="90" y="85" textAnchor="middle" className="text-[10px] font-semibold text-slate-500">
        Healthy
      </text>
      <text x="90" y="103" textAnchor="middle" className="text-base font-bold text-slate-900">
        {totalScore.toFixed(0)}%
      </text>
    </svg>
  );
}
