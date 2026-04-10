import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { BillingProvider } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import {
  createRazorpayPaymentLink,
  createRazorpayCustomer,
  createRazorpaySubscription,
  getRazorpayPublicConfig,
} from "@/lib/payments/razorpay";
import { buildAppUrl } from "@/lib/app-url";
import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  getPlanDefinition,
  isPlanUpgrade,
  normalizePlanCode,
  PlanCode,
} from "@/lib/billing/plans";
import { getExpectedSubscriptionAmountPaise } from "@/lib/billing/subscription-checkout";

const bodySchema = z.object({
  planCode: z.enum(["PREMIUM", "PREMIER"]),
  interval: z.enum(BILLING_INTERVALS),
  currency: z.enum(BILLING_CURRENCIES),
});

const RAZORPAY_SUBSCRIPTION_LINK_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

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
      { error: "Only workspace owners or admins can change the subscription" },
      { status: 403 }
    );
  }

  const rateLimit = checkRateLimitByProfile(
    req,
    "general",
    `ws:${workspace.id}:subscription-checkout`
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error || "Rate limit exceeded" }, { status: 429 });
  }

  const config = getRazorpayPublicConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { error: "Razorpay is not configured on the server" },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: workspace.id },
    include: { plan: true },
  });
  const currentPlanCode = normalizePlanCode(subscription?.plan?.code);
  const targetPlanCode = normalizePlanCode(body.planCode) as PlanCode;

  if (targetPlanCode !== "PREMIUM" && targetPlanCode !== "PREMIER") {
    return NextResponse.json({ error: "Invalid target plan" }, { status: 400 });
  }

  if (!isPlanUpgrade(currentPlanCode, targetPlanCode)) {
    return NextResponse.json(
      {
        error:
          "You can only upgrade to a higher tier here. To downgrade or cancel, use the options below.",
      },
      { status: 409 }
    );
  }

  const amountPaise = getExpectedSubscriptionAmountPaise(
    targetPlanCode,
    body.currency,
    body.interval
  );
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Invalid plan amount" }, { status: 400 });
  }

  const planMeta = getPlanDefinition(targetPlanCode);

  // --- Try Razorpay Subscriptions API path ---
  // Look for a stored Razorpay plan ID for this plan/currency/interval
  const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { code: targetPlanCode } });
  const razorpayPrice = dbPlan
    ? await prisma.planPrice.findFirst({
        where: {
          planId: dbPlan.id,
          currency: body.currency,
          interval: body.interval,
          provider: BillingProvider.RAZORPAY,
          isActive: true,
          providerPriceId: { not: null },
        },
      })
    : null;

  if (razorpayPrice?.providerPriceId) {
    // Subscriptions API path
    try {
      // Ensure customer exists
      let customerId = subscription?.providerCustomerId || null;
      if (!customerId && session.user.email) {
        const customer = await createRazorpayCustomer({
          name: session.user.name || undefined,
          email: session.user.email,
        });
        customerId = customer.id;

        // Persist the customer ID
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { providerCustomerId: customerId },
          });
        }
      }

      // totalCount: monthly→60, yearly→5
      const totalCount = body.interval === "year" ? 5 : 60;

      const rzpSub = await createRazorpaySubscription({
        planId: razorpayPrice.providerPriceId,
        customerId: customerId || undefined,
        totalCount,
        notes: {
          workspaceId: workspace.id,
          planCode: targetPlanCode,
          billingInterval: body.interval,
          billingCurrency: body.currency,
          purpose: "workspace_subscription",
        },
        notifyCustomer: true,
      });

      // Audit log for checkout started
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          workspaceId: workspace.id,
          action: "BILLING_CHECKOUT_STARTED",
          resourceType: "BILLING_SUBSCRIPTION",
          metadata: {
            planCode: targetPlanCode,
            interval: body.interval,
            currency: body.currency,
            amount: amountPaise,
            razorpaySubscriptionId: rzpSub.id,
            razorpayPlanId: razorpayPrice.providerPriceId,
            checkoutMethod: "subscription",
          } as any,
        },
      });

      return NextResponse.json({
        ok: true,
        subscriptionId: rzpSub.id,
        keyId: config.keyId,
        prefill: {
          email: session.user.email || "",
          name: session.user.name || "",
        },
        description: `PaperChai ${planMeta.name} (${body.interval}ly) — ${workspace.name}`,
        amount: amountPaise,
        currency: body.currency,
        interval: body.interval,
      });
    } catch (err) {
      console.error("[checkout] Razorpay subscription creation failed, falling back:", err);
      // Fall through to payment link fallback below
    }
  }

  // --- Fallback: Payment Links path ---
  const referenceId = `pcs_${randomBytes(6).toString("hex")}`;

  const link = await createRazorpayPaymentLink({
    amount: amountPaise,
    currency: body.currency,
    description: `PaperChai ${planMeta.name} (${body.interval}ly) — ${workspace.name}`,
    reference_id: referenceId,
    expire_by: Math.floor(Date.now() / 1000) + RAZORPAY_SUBSCRIPTION_LINK_LIFETIME_SECONDS,
    customer: {
      name: session.user.name || undefined,
      email: session.user.email || undefined,
    },
    notify: {
      email: true,
      sms: false,
    },
    reminder_enable: true,
    notes: {
      workspaceId: workspace.id,
      planCode: targetPlanCode,
      billingInterval: body.interval,
      billingCurrency: body.currency,
      purpose: "workspace_subscription",
    },
    accept_partial: false,
    callback_url: buildAppUrl("/settings/billing?subscription=success"),
    callback_method: "get",
  });

  // Audit log for payment link checkout
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      action: "BILLING_CHECKOUT_STARTED",
      resourceType: "BILLING_SUBSCRIPTION",
      metadata: {
        planCode: targetPlanCode,
        interval: body.interval,
        currency: body.currency,
        amount: amountPaise,
        referenceId,
        paymentLinkId: link.id,
        checkoutMethod: "payment_link",
      } as any,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentLinkUrl: link.short_url,
    referenceId,
  });
}
