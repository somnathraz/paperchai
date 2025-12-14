import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-600 bg-emerald-50";
  if (score >= 70) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export async function ReliabilityTable() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { reliabilityScore: "desc" },
    select: {
      name: true,
      reliabilityScore: true,
      averageDelayDays: true,
      outstanding: true,
      id: true,
    },
    take: 10,
  });

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clients</p>
          <h2 className="text-xl font-semibold">Reliability & unpaid</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI scored</span>
      </div>
      <div className="mt-4 w-full overflow-x-auto no-scrollbar rounded-2xl border border-border/60">
        <table className="min-w-max w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Score</th>
              <th className="px-4 py-3 text-left font-semibold">Avg delay</th>
              <th className="px-4 py-3 text-left font-semibold">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No clients yet.
                </td>
              </tr>
            )}
            {clients.map((client, idx) => (
              <tr key={client.id} className={idx % 2 === 0 ? "bg-white/70" : "bg-white/50"}>
                <td className="px-4 py-3 font-semibold text-foreground">{client.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scoreColor(client.reliabilityScore ?? 0)}`}>
                    {client.reliabilityScore ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {client.averageDelayDays != null ? `${client.averageDelayDays.toFixed(1)}d` : "—"}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {client.outstanding != null
                    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                        Number(client.outstanding)
                      )
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
