import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  normalizePlanCode,
  PlanCode,
  isPlanUpgrade,
  getPlanDefinition,
} from "@/lib/billing/plans";
import { getWorkspaceEntitlement } from "@/lib/entitlements";
import { createRazorpayPaymentLink, getRazorpayPublicConfig } from "@/lib/payments/razorpay";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";

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
      { error: "Only workspace owners or admins can manage billing" },
      { status: 403 }
    );
  }

  const rateLimit = checkRateLimitByProfile(req, "general", `ws:${workspace.id}:billing-checkout`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error || "Rate limit exceeded" }, { status: 429 });
  }

  const { keyId, isConfigured } = getRazorpayPublicConfig();
  if (!isConfigured) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
  }

  let body: { planCode?: string; interval?: string; currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planCode = normalizePlanCode(body.planCode) as PlanCode;
  const interval: (typeof BILLING_INTERVALS)[number] = body.interval === "year" ? "year" : "month";
  const currency: (typeof BILLING_CURRENCIES)[number] = body.currency === "USD" ? "USD" : "INR";

  if (planCode === "FREE") {
    return NextResponse.json({ error: "Cannot checkout to free plan" }, { status: 400 });
  }

  const entitlement = await getWorkspaceEntitlement(workspace.id, session.user.id);
  if (!isPlanUpgrade(entitlement.planCode, planCode)) {
    return NextResponse.json(
      { error: "Target plan is not an upgrade from current plan" },
      { status: 409 }
    );
  }

  const plan = getPlanDefinition(planCode);
  const amount =
    interval === "year" ? plan.pricing[currency].yearly : plan.pricing[currency].monthly;

  if (amount <= 0) {
    return NextResponse.json({ error: "Plan amount is zero" }, { status: 400 });
  }

  // Generate a unique reference ID for this checkout attempt
  const referenceId = `pcs_${randomBytes(6).toString("hex")}`;

  // Get owner details for the payment link customer info
  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });

  const callbackBase = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
  const callbackUrl = `${callbackBase}/settings/billing?subscription=success`;

  const paymentLink = await createRazorpayPaymentLink({
    amount,
    currency,
    description: `${plan.name} plan · ${interval === "year" ? "Annual" : "Monthly"} subscription`,
    reference_id: referenceId,
    customer: owner?.email
      ? {
          name: owner.name || undefined,
          email: owner.email,
        }
      : undefined,
    notify: { email: true, sms: false },
    reminder_enable: false,
    notes: {
      purpose: "workspace_subscription",
      workspaceId: workspace.id,
      planCode,
      billingInterval: interval,
      billingCurrency: currency,
      referenceId,
    },
    callback_url: callbackUrl,
    callback_method: "get",
  });

  // Record checkout intent for activation lookup
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      action: "BILLING_CHECKOUT_STARTED",
      resourceType: "BILLING_SUBSCRIPTION",
      metadata: {
        referenceId,
        planCode,
        interval,
        currency,
        amount,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url,
      } as any,
    },
  });

  return NextResponse.json({ paymentLinkUrl: paymentLink.short_url });
}
