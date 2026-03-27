import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { createRazorpayRefund, getRefundProviderReadiness } from "@/lib/billing/provider-refunds";
import { createPaymentSecurityAudit, recordPaymentEvent } from "@/lib/payments/provider-events";

const refundRequestSchema = z.object({
  auditLogId: z.string().cuid().or(z.string().uuid()),
  paymentId: z
    .string()
    .trim()
    .regex(/^pay_[A-Za-z0-9]+$/, "Invalid Razorpay payment id"),
});

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
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      metadata: {
        reason: "insufficient_role",
      },
    });
    return NextResponse.json(
      { error: "Only workspace owners or admins can process refunds" },
      { status: 403 }
    );
  }

  const rateLimit = checkRateLimitByProfile(req, "general", `ws:${workspace.id}:billing-refund`);
  if (!rateLimit.allowed) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      metadata: {
        reason: "rate_limited",
      },
    });
    return NextResponse.json({ error: rateLimit.error || "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = refundRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      metadata: {
        reason: "invalid_payload",
      },
    });
    return NextResponse.json({ error: "Invalid refund payload" }, { status: 422 });
  }
  const { auditLogId, paymentId } = parsed.data;

  const readiness = getRefundProviderReadiness();
  if (!readiness.razorpayConfigured) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      metadata: {
        reason: "provider_not_configured",
        auditLogId,
      },
    });
    return NextResponse.json(
      { error: "Razorpay refund env is not configured yet" },
      { status: 503 }
    );
  }

  const event = await prisma.auditLog.findFirst({
    where: {
      id: auditLogId,
      workspaceId: workspace.id,
      action: "BILLING_SUBSCRIPTION_CANCELED",
    },
  });

  if (!event) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: auditLogId,
      metadata: {
        reason: "cancellation_event_not_found",
      },
    });
    return NextResponse.json({ error: "Billing cancellation event not found" }, { status: 404 });
  }

  const metadata = ((event.metadata as Record<string, any>) || {}) as Record<string, any>;
  const refundableAmount = Number(metadata.refundableAmount || 0);
  if (refundableAmount <= 0) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: event.id,
      metadata: {
        reason: "no_refundable_amount",
        refundableAmount,
      },
    });
    return NextResponse.json({ error: "No refundable amount available" }, { status: 409 });
  }

  if (metadata.refundStatus === "PROCESSED") {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: event.id,
      metadata: {
        reason: "already_processed",
        paymentId,
      },
    });
    return NextResponse.json({ error: "Refund already processed" }, { status: 409 });
  }

  if (metadata.refundStatus === "PROCESSING") {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: event.id,
      metadata: {
        reason: "already_processing",
        paymentId,
      },
    });
    return NextResponse.json({ error: "Refund is already in progress" }, { status: 409 });
  }

  if (metadata.providerPaymentId && metadata.providerPaymentId !== paymentId) {
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_REJECTED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: event.id,
      metadata: {
        reason: "payment_id_mismatch",
        existingPaymentId: metadata.providerPaymentId,
        paymentId,
      },
    });
    return NextResponse.json(
      { error: "Refund event is already bound to a different payment id" },
      { status: 409 }
    );
  }
  let refund;
  try {
    refund = await createRazorpayRefund({
      paymentId,
      amount: refundableAmount,
      receipt: event.id,
      notes: {
        workspaceId: workspace.id,
        auditLogId: event.id,
        refundType: "subscription_cancellation",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund processing failed";
    await createPaymentSecurityAudit({
      action: "BILLING_REFUND_FAILED",
      workspaceId: workspace.id,
      userId: session.user.id,
      resourceType: "BILLING_REFUND",
      resourceId: event.id,
      metadata: {
        paymentId,
        amount: refundableAmount,
        error: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const nextMetadata = {
    ...metadata,
    providerPaymentId: paymentId,
    refundStatus: refund.status === "processed" ? "PROCESSED" : "PROCESSING",
    refundProvider: "RAZORPAY",
    refundId: refund.id,
    refundedAt: new Date().toISOString(),
  };

  await prisma.auditLog.update({
    where: { id: event.id },
    data: {
      metadata: nextMetadata as any,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      action: "BILLING_REFUND_REQUESTED",
      resourceType: "BILLING_REFUND",
      resourceId: refund.id,
      metadata: {
        sourceAuditLogId: event.id,
        provider: "RAZORPAY",
        paymentId,
        refundId: refund.id,
        amount: refundableAmount,
        status: nextMetadata.refundStatus,
      } as any,
    },
  });

  await recordPaymentEvent({
    provider: "razorpay",
    eventType: "subscription_refund",
    eventKey: `razorpay:refund:${refund.id}`,
    direction: "OUTBOUND",
    status: nextMetadata.refundStatus,
    externalPaymentId: paymentId,
    externalRefundId: refund.id,
    workspaceId: workspace.id,
    subscriptionId: String(event.resourceId || ""),
    amount: refundableAmount,
    currency: String(metadata.currency || "INR"),
    metadata: {
      sourceAuditLogId: event.id,
      requestedByUserId: session.user.id,
      refundType: "subscription_cancellation",
    },
  });

  return NextResponse.json({
    ok: true,
    refund: {
      id: refund.id,
      status: nextMetadata.refundStatus,
      amount: refundableAmount,
    },
  });
}
