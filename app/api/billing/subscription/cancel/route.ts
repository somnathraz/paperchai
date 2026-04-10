import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { deriveSubscriptionPeriodEnd, calculateProratedRefund } from "@/lib/billing/cancellation";
import { sendSubscriptionCancelledEmail } from "@/lib/billing/emails";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners or admins can cancel subscription" },
      { status: 403 }
    );
  }

  const rateLimit = checkRateLimitByProfile(req, "general", `ws:${workspace.id}:billing-cancel`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error || "Rate limit exceeded" }, { status: 429 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: workspace.id },
    include: {
      plan: true,
      workspace: true,
    },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (subscription.plan.code === "FREE") {
    return NextResponse.json({ error: "Free plan does not need cancellation" }, { status: 409 });
  }

  // 7-day cancellation policy: cancellations are only allowed within 7 days of purchase.
  // After 7 days, the current month/year is non-refundable and cannot be cancelled mid-cycle.
  const CANCELLATION_WINDOW_DAYS = 7;
  const periodStart = subscription.currentPeriodStart;
  if (periodStart) {
    const daysSincePurchase =
      (Date.now() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > CANCELLATION_WINDOW_DAYS) {
      const windowEnds = new Date(periodStart);
      windowEnds.setDate(windowEnds.getDate() + CANCELLATION_WINDOW_DAYS);
      return NextResponse.json(
        {
          error: `Cancellations are only allowed within ${CANCELLATION_WINDOW_DAYS} days of purchase. The cancellation window closed on ${windowEnds.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Your plan will remain active until the end of the current billing period.`,
          code: "CANCELLATION_WINDOW_EXPIRED",
        },
        { status: 409 }
      );
    }
  }

  const price = subscription.priceId
    ? await prisma.planPrice.findUnique({ where: { id: subscription.priceId } })
    : await prisma.planPrice.findFirst({
        where: {
          planId: subscription.planId,
          provider: subscription.provider,
          isActive: true,
        },
        orderBy: { amount: "desc" },
      });

  const interval = price?.interval === "year" ? "year" : "month";
  const billingPeriodStart = subscription.currentPeriodStart || new Date();
  const periodEnd = deriveSubscriptionPeriodEnd(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    interval
  );

  if (!periodEnd) {
    return NextResponse.json(
      { error: "Could not determine billing period for cancellation" },
      { status: 422 }
    );
  }

  const cancelledAt = new Date();
  const proration = calculateProratedRefund({
    priceAmount: price?.amount || 0,
    periodStart: billingPeriodStart,
    periodEnd,
    cancelledAt,
  });

  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { code: "FREE" },
  });

  if (!freePlan) {
    return NextResponse.json({ error: "Free plan catalog missing" }, { status: 500 });
  }

  const freePrice = await prisma.planPrice.findFirst({
    where: {
      planId: freePlan.id,
      currency: price?.currency || "INR",
      interval,
      isActive: true,
    },
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: freePlan.id,
      priceId: freePrice?.id || null,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      currentPeriodStart: cancelledAt,
      currentPeriodEnd: null,
      featuresSnapshot: freePlan.features as any,
      limitsSnapshot: freePlan.limits as any,
      seatsIncluded: 1,
      seatsAddon: 0,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      action: "BILLING_SUBSCRIPTION_CANCELED",
      resourceType: "BILLING_SUBSCRIPTION",
      resourceId: subscription.id,
      metadata: {
        previousPlanCode: subscription.plan.code,
        nextPlanCode: "FREE",
        provider: subscription.provider,
        currency: price?.currency || "INR",
        interval,
        cancelledAt: cancelledAt.toISOString(),
        billingPeriodStart: billingPeriodStart.toISOString(),
        billingPeriodEnd: periodEnd.toISOString(),
        planAmount: price?.amount || 0,
        chargeForUsedPeriod: proration.chargeForUsedPeriod,
        refundableAmount: proration.refundableAmount,
        refundStatus: "PENDING_MANUAL",
      } as any,
    },
  });

  // Send cancellation confirmation email (fire-and-forget)
  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (owner?.email) {
    sendSubscriptionCancelledEmail({
      ownerEmail: owner.email,
      ownerName: owner.name || owner.email.split("@")[0],
      workspaceName: workspace.name,
      previousPlan: subscription.plan.code,
      cancelledAt,
      refundableAmount: proration.refundableAmount,
      currency: price?.currency || "INR",
    }).catch((err) => console.error("[billing/cancel] Failed to send cancellation email:", err));
  }

  return NextResponse.json({
    ok: true,
    cancelledAt: cancelledAt.toISOString(),
    billingPeriodStart: billingPeriodStart.toISOString(),
    billingPeriodEnd: periodEnd.toISOString(),
    refund: {
      currency: price?.currency || "INR",
      planAmount: price?.amount || 0,
      chargeForUsedPeriod: proration.chargeForUsedPeriod,
      refundableAmount: proration.refundableAmount,
      refundStatus: "PENDING_MANUAL",
    },
    message:
      "Subscription canceled. Charges apply only up to the cancellation date. Remaining unused prepaid amount should be refunded.",
  });
}
