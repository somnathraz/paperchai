import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { deriveSubscriptionPeriodEnd, calculateProratedRefund } from "@/lib/billing/cancellation";

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
  const periodStart = subscription.currentPeriodStart || new Date();
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
    periodStart,
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
        billingPeriodStart: periodStart.toISOString(),
        billingPeriodEnd: periodEnd.toISOString(),
        planAmount: price?.amount || 0,
        chargeForUsedPeriod: proration.chargeForUsedPeriod,
        refundableAmount: proration.refundableAmount,
        refundStatus: "PENDING_MANUAL",
      } as any,
    },
  });

  return NextResponse.json({
    ok: true,
    cancelledAt: cancelledAt.toISOString(),
    billingPeriodStart: periodStart.toISOString(),
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
