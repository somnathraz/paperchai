import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { SettingsLayout } from "@/components/settings/settings-layout";

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function BillingHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings/billing/history");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/dashboard");
  }

  // Only show completed subscription payments
  const payments = await prisma.auditLog.findMany({
    where: {
      workspaceId: workspace.id,
      action: "BILLING_SUBSCRIPTION_UPGRADED",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <SettingsLayout
      current="/settings/billing/history"
      title="Billing history"
      description="Your workspace subscription payments."
    >
      <div className="rounded-2xl border border-white/20 bg-white/70 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No payments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Subscription payments will appear here once you upgrade.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Plan
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Mode
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {payments.map((p) => {
                const meta = (p.metadata || {}) as Record<string, any>;
                const amount = meta.amount || meta.amountPaise || 0;
                const currency = meta.currency || "INR";
                const interval = meta.interval === "year" ? "Yearly" : "Monthly";
                const planCode = meta.planCode || "—";
                const source = meta.activationSource === "manual_fix" ? "Manual" : "Razorpay";

                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-foreground whitespace-nowrap">
                      {fmtDate(p.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-foreground">{planCode}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{interval}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{source}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-600">
                      {amount > 0 ? fmt(amount, currency) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </SettingsLayout>
  );
}
