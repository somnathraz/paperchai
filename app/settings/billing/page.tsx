import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { startOfMonth } from "date-fns";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { BILLING_CURRENCIES, getPlanDefinition } from "@/lib/billing/plans";
import { getRazorpayPublicConfig } from "@/lib/payments/razorpay";
import { getWorkspaceEntitlement } from "@/lib/entitlements";
import { deriveSubscriptionPeriodEnd, calculateProratedRefund } from "@/lib/billing/cancellation";
import { SubscriptionCancelCard } from "@/components/settings/subscription-cancel-card";
import { BillingRefundBanner } from "@/components/settings/billing-refund-banner";
import { BillingEventsCard } from "@/components/settings/billing-events-card";
import { BillingRefundActionsCard } from "@/components/settings/billing-refund-actions-card";
import { getRefundProviderReadiness } from "@/lib/billing/provider-refunds";
import { SubscriptionSuccessBanner } from "@/components/settings/subscription-success-banner";
import { WorkspacePlanCards } from "@/components/settings/workspace-plan-cards";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

const refundReadiness = getRefundProviderReadiness();

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings/billing");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/dashboard");
  }
  const refundReadiness = getRefundProviderReadiness();

  const [
    membership,
    entitlement,
    subscription,
    invoiceUsage,
    clientCount,
    reminderCount,
    billingEvents,
  ] = await Promise.all([
    getWorkspaceMembership(session.user.id, workspace.id),
    getWorkspaceEntitlement(workspace.id, session.user.id),
    prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
      include: {
        plan: true,
      },
    }),
    prisma.usageCounter.findUnique({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId: workspace.id,
          metric: "invoices_per_month",
          periodStart: startOfMonth(new Date()),
        },
      },
    }),
    prisma.client.count({ where: { workspaceId: workspace.id } }),
    prisma.reminderHistory.count({
      where: {
        workspaceId: workspace.id,
        sentAt: { gte: startOfMonth(new Date()) },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        workspaceId: workspace.id,
        action: { startsWith: "BILLING_" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const price = subscription
    ? await prisma.planPrice.findFirst({
        where: {
          planId: subscription.planId,
          provider: "MANUAL",
          currency: "INR",
          interval: "year",
          isActive: true,
        },
      })
    : null;

  const plan = getPlanDefinition(subscription?.plan?.code || entitlement.planCode);
  const billingCurrency =
    price?.currency && BILLING_CURRENCIES.includes(price.currency as "INR" | "USD")
      ? (price.currency as "INR" | "USD")
      : "INR";
  const billingInterval = price?.interval === "year" ? "year" : "month";
  const currentPrice =
    billingInterval === "year"
      ? plan.pricing[billingCurrency].yearly
      : plan.pricing[billingCurrency].monthly;
  const cancellationPeriodStart = subscription?.currentPeriodStart || null;
  const cancellationPeriodEnd = deriveSubscriptionPeriodEnd(
    subscription?.currentPeriodStart || null,
    subscription?.currentPeriodEnd || null,
    billingInterval
  );
  const cancellationPreview =
    subscription && cancellationPeriodStart && cancellationPeriodEnd
      ? calculateProratedRefund({
          priceAmount: currentPrice,
          periodStart: cancellationPeriodStart,
          periodEnd: cancellationPeriodEnd,
          cancelledAt: new Date(),
        })
      : null;
  const latestCancellation = billingEvents.find(
    (event) => event.action === "BILLING_SUBSCRIPTION_CANCELED"
  );
  const latestCancellationMeta = latestCancellation?.metadata as
    | {
        cancelledAt?: string;
        currency?: string;
        refundableAmount?: number;
        chargeForUsedPeriod?: number;
        refundStatus?: string;
      }
    | undefined;

  return (
    <SettingsLayout
      current="/settings/billing"
      title="Billing & subscription"
      description="Choose a plan that matches how you bill and remind clients. Paid workspace subscriptions and client checkout are processed securely with Razorpay."
    >
      <div className="space-y-6">
        <SubscriptionSuccessBanner />
        <BillingRefundBanner
          cancellation={
            latestCancellation && latestCancellationMeta?.cancelledAt
              ? {
                  cancelledAt: latestCancellationMeta.cancelledAt,
                  currency: latestCancellationMeta.currency || billingCurrency,
                  refundableAmount: Number(latestCancellationMeta.refundableAmount || 0),
                  chargeForUsedPeriod: Number(latestCancellationMeta.chargeForUsedPeriod || 0),
                  refundStatus: latestCancellationMeta.refundStatus || "PENDING_MANUAL",
                }
              : null
          }
        />

        <div className="flex justify-end">
          <Link
            href="/settings/billing/history"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
          >
            View billing history →
          </Link>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Current plan
              </p>
              <p className="text-lg font-semibold">
                {plan.name} ·{" "}
                {currentPrice === 0
                  ? "Free"
                  : `${formatMoney(currentPrice, billingCurrency)} / ${billingInterval === "year" ? "year" : "month"}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Workspace role: {membership?.role || "Unknown"} ·{" "}
                {entitlement.platformBypass
                  ? "Platform bypass active"
                  : `Subscription ${entitlement.subscriptionStatus.toLowerCase()}`}
              </p>
            </div>
            <Link
              href="#workspace-plans"
              className="inline-flex rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              Compare plans
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Invoices</p>
              <p className="mt-2 text-lg font-semibold">
                {invoiceUsage?.count || 0} /{" "}
                {entitlement.limits.invoicesPerMonth === -1
                  ? "Unlimited"
                  : entitlement.limits.invoicesPerMonth}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Clients</p>
              <p className="mt-2 text-lg font-semibold">
                {clientCount} /{" "}
                {entitlement.limits.clients === -1 ? "Unlimited" : entitlement.limits.clients}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Reminders sent
              </p>
              <p className="mt-2 text-lg font-semibold">
                {reminderCount} /{" "}
                {entitlement.limits.reminderEmailsPerMonth === -1
                  ? "Unlimited"
                  : entitlement.limits.reminderEmailsPerMonth}
              </p>
            </div>
          </div>
        </div>

        <WorkspacePlanCards
          currentPlanCode={plan.code}
          canManageBilling={["OWNER", "ADMIN"].includes(membership?.role || "")}
          razorpayConfigured={getRazorpayPublicConfig().isConfigured}
          platformBypass={Boolean(entitlement.platformBypass)}
        />

        <SubscriptionCancelCard
          canCancel={plan.code !== "FREE" && ["OWNER", "ADMIN"].includes(membership?.role || "")}
          currency={billingCurrency}
          periodStart={cancellationPeriodStart?.toISOString() || null}
          periodEnd={cancellationPeriodEnd?.toISOString() || null}
          chargeForUsedPeriod={cancellationPreview?.chargeForUsedPeriod || 0}
          refundableAmount={cancellationPreview?.refundableAmount || 0}
        />

        <BillingRefundActionsCard
          razorpayReady={refundReadiness.razorpayConfigured}
          events={billingEvents
            .filter((event) => event.action === "BILLING_SUBSCRIPTION_CANCELED")
            .map((event) => ({
              id: event.id,
              createdAt: event.createdAt.toISOString(),
              metadata: (event.metadata as any) || null,
            }))}
        />

        <BillingEventsCard
          events={billingEvents.map((event) => ({
            id: event.id,
            action: event.action,
            createdAt: event.createdAt.toISOString(),
            metadata: (event.metadata as any) || null,
          }))}
        />
      </div>
    </SettingsLayout>
  );
}
