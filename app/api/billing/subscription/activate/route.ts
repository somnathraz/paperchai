import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { BillingProvider } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { createHmacSignature } from "@/lib/encryption";
import { provisionWorkspaceSubscription } from "@/lib/billing/subscriptions";
import { verifyRazorpaySubscriptionSignature } from "@/lib/payments/razorpay";
import {
  normalizePlanCode,
  PlanCode,
  BILLING_INTERVALS,
  BILLING_CURRENCIES,
} from "@/lib/billing/plans";

function verifyPaymentLinkSignature({
  paymentLinkId,
  referenceId,
  status,
  paymentId,
  signature,
  keySecret,
}: {
  paymentLinkId: string;
  referenceId: string;
  status: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  // Razorpay payment link callback signature: HMAC-SHA256(paymentLinkId|referenceId|status|paymentId)
  const message = `${paymentLinkId}|${referenceId}|${status}|${paymentId}`;
  const expected = createHmacSignature(message, keySecret);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch {
    return expected === signature;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let body: {
    razorpay_payment_id?: string;
    razorpay_payment_link_id?: string;
    razorpay_payment_link_reference_id?: string;
    razorpay_payment_link_status?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
  }

  // --- Branch: Subscription API activation ---
  if (body.razorpay_subscription_id && !body.razorpay_payment_link_id) {
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    } = body;

    if (!paymentId || !subscriptionId || !signature) {
      return NextResponse.json(
        { error: "Missing required subscription activation parameters" },
        { status: 400 }
      );
    }

    // Verify signature: HMAC-SHA256(paymentId|subscriptionId, keySecret)
    let valid = false;
    try {
      valid = verifyRazorpaySubscriptionSignature({ paymentId, subscriptionId, signature });
    } catch {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 503 });
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid subscription payment signature" },
        { status: 401 }
      );
    }

    // Check idempotency
    const existingUpgrade = await prisma.auditLog.findFirst({
      where: {
        workspaceId: workspace.id,
        action: "BILLING_SUBSCRIPTION_UPGRADED",
        metadata: {
          path: ["razorpaySubscriptionId"],
          equals: subscriptionId,
        },
      },
    });

    if (existingUpgrade) {
      const sub = await prisma.subscription.findUnique({
        where: { workspaceId: workspace.id },
        include: { plan: true },
      });
      return NextResponse.json({
        ok: true,
        alreadyActivated: true,
        planCode: sub?.plan?.code || "UNKNOWN",
      });
    }

    // Find checkout intent from audit log to get planCode and interval
    let checkoutLog = await prisma.auditLog.findFirst({
      where: {
        workspaceId: workspace.id,
        action: "BILLING_CHECKOUT_STARTED",
        metadata: {
          path: ["razorpaySubscriptionId"],
          equals: subscriptionId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!checkoutLog) {
      const recent = await prisma.auditLog.findMany({
        where: { workspaceId: workspace.id, action: "BILLING_CHECKOUT_STARTED" },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      checkoutLog =
        recent.find(
          (row) =>
            (row.metadata as { razorpaySubscriptionId?: string } | null)?.razorpaySubscriptionId ===
            subscriptionId
        ) || null;
    }

    if (!checkoutLog) {
      return NextResponse.json(
        {
          error:
            "Checkout intent not found. If payment was completed, it will be processed via webhook shortly.",
        },
        { status: 404 }
      );
    }

    const meta = checkoutLog.metadata as {
      planCode: string;
      interval: string;
      currency: string;
      amount: number;
      razorpaySubscriptionId: string;
    };

    const planCode = normalizePlanCode(meta.planCode) as PlanCode;
    const interval: (typeof BILLING_INTERVALS)[number] =
      meta.interval === "year" ? "year" : "month";
    const currency: (typeof BILLING_CURRENCIES)[number] = meta.currency === "USD" ? "USD" : "INR";

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    if (interval === "year") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await provisionWorkspaceSubscription(workspace.id, { planCode, currency, interval });

    await prisma.subscription.update({
      where: { workspaceId: workspace.id },
      data: {
        providerSubId: subscriptionId,
        provider: BillingProvider.RAZORPAY,
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        action: "BILLING_SUBSCRIPTION_UPGRADED",
        resourceType: "BILLING_SUBSCRIPTION",
        metadata: {
          planCode,
          interval,
          currency,
          paymentId,
          razorpaySubscriptionId: subscriptionId,
          purpose: "workspace_subscription",
          upgradedAt: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          activationSource: "subscription_checkout",
        } as any,
      },
    });

    return NextResponse.json({ ok: true, planCode });
  }

  // --- Branch: Payment Link activation (existing logic) ---
  const {
    razorpay_payment_id: paymentId,
    razorpay_payment_link_id: paymentLinkId,
    razorpay_payment_link_reference_id: referenceId,
    razorpay_payment_link_status: status,
    razorpay_signature: signature,
  } = body;

  if (!paymentId || !paymentLinkId || !referenceId || !status || !signature) {
    return NextResponse.json(
      { error: "Missing required Razorpay callback parameters" },
      { status: 400 }
    );
  }

  if (status !== "paid") {
    return NextResponse.json(
      { error: `Payment not completed. Status: ${status}` },
      { status: 422 }
    );
  }

  // Verify Razorpay signature
  const valid = verifyPaymentLinkSignature({
    paymentLinkId,
    referenceId,
    status,
    paymentId,
    signature,
    keySecret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
  }

  // Look up checkout intent by referenceId from audit log
  const checkoutLog = await prisma.auditLog.findFirst({
    where: {
      workspaceId: workspace.id,
      action: "BILLING_CHECKOUT_STARTED",
      metadata: {
        path: ["referenceId"],
        equals: referenceId,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!checkoutLog) {
    return NextResponse.json(
      {
        error:
          "Checkout intent not found. If payment was completed, it will be processed via webhook shortly.",
      },
      { status: 404 }
    );
  }

  const meta = checkoutLog.metadata as {
    referenceId: string;
    planCode: string;
    interval: string;
    currency: string;
    amount: number;
    paymentLinkId: string;
  };

  // Check if already activated (idempotency)
  const existingUpgrade = await prisma.auditLog.findFirst({
    where: {
      workspaceId: workspace.id,
      action: "BILLING_SUBSCRIPTION_UPGRADED",
      metadata: {
        path: ["referenceId"],
        equals: referenceId,
      },
    },
  });

  if (existingUpgrade) {
    // Already activated — return current plan
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
      include: { plan: true },
    });
    return NextResponse.json({
      ok: true,
      alreadyActivated: true,
      planCode: subscription?.plan?.code || meta.planCode,
    });
  }

  const planCode = normalizePlanCode(meta.planCode) as PlanCode;
  const interval: (typeof BILLING_INTERVALS)[number] = meta.interval === "year" ? "year" : "month";
  const currency: (typeof BILLING_CURRENCIES)[number] = meta.currency === "USD" ? "USD" : "INR";

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (interval === "year") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await provisionWorkspaceSubscription(workspace.id, { planCode, currency, interval });

  await prisma.subscription.update({
    where: { workspaceId: workspace.id },
    data: { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      action: "BILLING_SUBSCRIPTION_UPGRADED",
      resourceType: "BILLING_SUBSCRIPTION",
      metadata: {
        planCode,
        interval,
        currency,
        paymentId,
        paymentLinkId,
        referenceId,
        purpose: "workspace_subscription",
        upgradedAt: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        activationSource: "callback",
      } as any,
    },
  });

  return NextResponse.json({ ok: true, planCode, interval, currency });
}
