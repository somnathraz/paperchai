import { AlertTriangle, ArrowUpRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function Insights() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return null;

  // Fetch clients with reliability data
  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    select: {
      name: true,
      reliabilityScore: true,
      averageDelayDays: true,
      outstanding: true,
    },
    orderBy: { reliabilityScore: "asc" },
  });

  // Fetch recent invoices to check payment patterns
  const recentInvoices = await prisma.invoice.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["sent", "scheduled"] },
    },
    select: {
      dueDate: true,
      total: true,
      client: { select: { name: true, reliabilityScore: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // Clients to escalate (low reliability or high delay)
  const clientsToEscalate = clients
    .filter((c) => (c.reliabilityScore ?? 100) < 70 || (c.averageDelayDays ?? 0) > 7)
    .slice(0, 3)
    .map((c) => {
      const delay = c.averageDelayDays?.toFixed(1) ?? "0";
      const daysLate = c.averageDelayDays && c.averageDelayDays > 0 ? `${Math.round(c.averageDelayDays)} days late` : `avg delay ${delay}d`;
      return `${c.name} — ${daysLate}`;
    });

  // Good payers (high reliability)
  const goodPayers = clients
    .filter((c) => (c.reliabilityScore ?? 0) >= 85)
    .slice(0, 3)
    .map((c) => {
      const score = c.reliabilityScore ?? 0;
      return `${c.name} — ${Math.round(score)}% reliable`;
    });

  // Predictions based on recent invoices and client reliability
  const likelyToPay = recentInvoices.filter((inv) => {
    const score = inv.client?.reliabilityScore ?? 0;
    return score >= 80;
  }).length;

  const insights = [];

  // Add "Clients to escalate" if there are any
  if (clientsToEscalate.length > 0) {
    insights.push({
      title: "Clients to escalate",
      items: clientsToEscalate,
      tone: "danger" as const,
      action: "View clients",
    });
  }

  // Add "Good payers" if there are any
  if (goodPayers.length > 0) {
    insights.push({
      title: "Good payers",
      items: goodPayers,
      tone: "success" as const,
      action: "See details",
    });
  }

  // Add predictions
  const predictionItems = [];
  if (likelyToPay > 0) {
    predictionItems.push(`${likelyToPay} invoice${likelyToPay !== 1 ? "s" : ""} likely to pay soon`);
  }
  
  // Calculate reliability trend (compare recent vs older clients)
  if (clients.length > 0) {
    const recentClients = clients.slice(0, Math.min(5, clients.length));
    const recentAvg = recentClients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / recentClients.length;
    const olderClients = clients.slice(5);
    if (olderClients.length > 0) {
      const olderAvg = olderClients.reduce((sum, c) => sum + (c.reliabilityScore ?? 0), 0) / olderClients.length;
      const trend = recentAvg - olderAvg;
      if (Math.abs(trend) > 2) {
        predictionItems.push(`Reliability score ${trend > 0 ? "trending +" : "trending "}${Math.abs(trend).toFixed(0)} this week`);
      }
    }
  }

  if (predictionItems.length > 0) {
    insights.push({
      title: "Predictions",
      items: predictionItems,
      tone: "info" as const,
      action: "View predictions",
    });
  }

  // If no insights, show empty state
  if (insights.length === 0) {
    return (
      <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI signals</p>
            <h2 className="text-xl font-semibold">What to focus on</h2>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No insights yet. Create invoices and track payments to see AI-powered insights.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI signals</p>
          <h2 className="text-xl font-semibold">What to focus on</h2>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-4 w-full flex flex-wrap gap-4">
        {insights.map((card) => (
          <div
            key={card.title}
            className="w-full space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{card.title}</p>
              {card.tone === "danger" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-primary" />
              )}
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {card.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full rounded-full border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5">
              {card.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
