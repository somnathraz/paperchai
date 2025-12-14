import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function trendColor(trend?: number | null) {
  if (trend == null) return "text-muted-foreground";
  return trend < 0 ? "text-red-600" : "text-emerald-600";
}

export async function ClientHealth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      reliabilityScore: true,
      averageDelayDays: true,
      outstanding: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Clients</p>
          <h2 className="text-xl font-semibold">Who needs your attention</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {clients.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No clients yet.
          </div>
        )}
        {clients.map((client) => (
          <div key={client.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-inner">
            <div>
              <p className="text-sm font-semibold text-foreground">{client.name}</p>
              <p className="text-xs text-muted-foreground">
                Avg delay {client.averageDelayDays?.toFixed(1) ?? "—"}d · Unpaid{" "}
                {client.outstanding != null
                  ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                      Number(client.outstanding)
                    )
                  : "—"}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 text-sm">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                Score {client.reliabilityScore ?? "—"}
              </span>
              <span className={`text-xs font-semibold ${trendColor(client.averageDelayDays)}`}>
                {client.averageDelayDays != null ? `${client.averageDelayDays > 0 ? "-" : "+"}${Math.abs(client.averageDelayDays).toFixed(1)}d` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
