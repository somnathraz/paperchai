import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { CheckCircle, XCircle, RefreshCw, ArrowUpCircle, Clock } from "lucide-react";

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

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  BILLING_SUBSCRIPTION_CANCELED: {
    label: "Subscription cancelled",
    color: "text-red-600",
    icon: "cancel",
  },
  BILLING_REFUND_REQUESTED: { label: "Refund requested", color: "text-amber-600", icon: "refund" },
  BILLING_SUBSCRIPTION_UPGRADED: {
    label: "Plan upgraded",
    color: "text-emerald-600",
    icon: "upgrade",
  },
  BILLING_SUBSCRIPTION_CREATED: {
    label: "Subscription created",
    color: "text-emerald-600",
    icon: "upgrade",
  },
};

export default async function BillingHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings/billing/history");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/dashboard");
  }

  const [billingAuditLogs, paymentEvents] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        workspaceId: workspace.id,
        action: { startsWith: "BILLING_" },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentEvent.findMany({
      where: {
        workspaceId: workspace.id,
        status: { in: ["PAID", "PARTIAL"] },
      },
      include: {
        invoice: { select: { number: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <SettingsLayout
      current="/settings/billing/history"
      title="Billing history"
      description="Past payments, plan changes, and refunds."
    >
      <div className="space-y-6">
        {/* Invoice payments */}
        <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
            Invoice payments received
          </h2>
          {paymentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {paymentEvents.map((evt) => {
                const currency = evt.invoice?.currency || evt.currency || "INR";
                const amount = evt.amount ? fmt(evt.amount, currency) : "—";
                const isPartial = evt.status === "PARTIAL";
                return (
                  <div key={evt.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isPartial ? "bg-amber-50" : "bg-emerald-50"
                        }`}
                      >
                        <CheckCircle
                          className={`h-4 w-4 ${isPartial ? "text-amber-500" : "text-emerald-500"}`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isPartial ? "Partial payment" : "Payment received"}
                          {evt.invoice?.number ? ` · ${evt.invoice.number}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(evt.createdAt)} · via {evt.provider}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        isPartial ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      +{amount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscription & billing events */}
        <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
            Plan &amp; subscription activity
          </h2>
          {billingAuditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billing events recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {billingAuditLogs.map((log) => {
                const meta = (log.metadata || {}) as Record<string, any>;
                const info = ACTION_LABELS[log.action] || {
                  label: log.action.replace("BILLING_", "").replace(/_/g, " ").toLowerCase(),
                  color: "text-foreground",
                  icon: "default",
                };
                const Icon =
                  info.icon === "cancel"
                    ? XCircle
                    : info.icon === "refund"
                      ? RefreshCw
                      : info.icon === "upgrade"
                        ? ArrowUpCircle
                        : Clock;
                const iconBg =
                  info.icon === "cancel"
                    ? "bg-red-50"
                    : info.icon === "refund"
                      ? "bg-amber-50"
                      : info.icon === "upgrade"
                        ? "bg-emerald-50"
                        : "bg-slate-50";

                return (
                  <div key={log.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${iconBg}`}
                      >
                        <Icon className={`h-4 w-4 ${info.color}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium capitalize ${info.color}`}>
                          {info.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDate(log.createdAt)}</p>
                        {meta.previousPlanCode && meta.nextPlanCode && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {meta.previousPlanCode} → {meta.nextPlanCode}
                          </p>
                        )}
                        {meta.refundableAmount != null && meta.refundableAmount > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            Refund: {fmt(meta.refundableAmount, meta.currency || "INR")} ·{" "}
                            {meta.refundStatus || "pending"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Cancellations are only allowed within 7 days of purchase. After 7 days, the current
          billing period is non-refundable.
        </p>
      </div>
    </SettingsLayout>
  );
}
