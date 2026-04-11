import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { startOfMonth } from "date-fns";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { BILLING_CURRENCIES, getPlanDefinition, type PlanCode } from "@/lib/billing/plans";
import { getRazorpayPublicConfig } from "@/lib/payments/razorpay";
import { getWorkspaceEntitlement } from "@/lib/entitlements";
import { deriveSubscriptionPeriodEnd, calculateProratedRefund } from "@/lib/billing/cancellation";
import { SubscriptionCancelCard } from "@/components/settings/subscription-cancel-card";
import { BillingRefundBanner } from "@/components/settings/billing-refund-banner";
import { BillingRefundActionsCard } from "@/components/settings/billing-refund-actions-card";
import { getRefundProviderReadiness } from "@/lib/billing/provider-refunds";
import { SubscriptionSuccessBanner } from "@/components/settings/subscription-success-banner";
import { BillingUpgradeCelebration } from "@/components/settings/billing-upgrade-celebration";
import { BillingPlanSection } from "@/components/settings/billing-plan-section";

export const dynamic = "force-dynamic";

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
  const razorpayPublic = getRazorpayPublicConfig();

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

  const price = subscription?.priceId
    ? await prisma.planPrice.findUnique({ where: { id: subscription.priceId } })
    : subscription
      ? await prisma.planPrice.findFirst({
          where: {
            planId: subscription.planId,
            provider: "MANUAL",
            isActive: true,
          },
          orderBy: [{ interval: "desc" }],
        })
      : null;

  const plan = getPlanDefinition(subscription?.plan?.code || entitlement.planCode);
  const billingCurrency =
    price?.currency && BILLING_CURRENCIES.includes(price.currency as "INR" | "USD")
      ? (price.currency as "INR" | "USD")
      : "INR";
  const billingInterval =
    price?.interval === "year" || price?.interval === "month" ? price.interval : "month";
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
        <BillingUpgradeCelebration />
        <Suspense fallback={null}>
          <SubscriptionSuccessBanner />
        </Suspense>
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

        <BillingPlanSection
          currentPlanCode={plan.code as PlanCode}
          hasActivePaidPlan={
            plan.code !== "FREE" &&
            (subscription?.status === "ACTIVE" || subscription?.status === "TRIALING")
          }
          canManageBilling={["OWNER", "ADMIN"].includes(membership?.role || "")}
          razorpayConfigured={razorpayPublic.isConfigured}
          platformBypass={Boolean(entitlement.platformBypass)}
          planName={plan.name}
          billingCurrency={billingCurrency}
          billingInterval={billingInterval}
          currentPrice={currentPrice}
          periodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
          invoiceUsed={invoiceUsage?.count || 0}
          invoiceLimit={entitlement.limits.invoicesPerMonth}
          clientUsed={clientCount}
          clientLimit={entitlement.limits.clients}
          reminderUsed={reminderCount}
          reminderLimit={entitlement.limits.reminderEmailsPerMonth}
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
      </div>
    </SettingsLayout>
  );
}
