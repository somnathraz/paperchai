import { prisma } from "@/lib/prisma";

type WebhookEventStatus = "RECEIVED" | "PROCESSED" | "IGNORED" | "FAILED" | "DUPLICATE";

export function buildRazorpayWebhookEventKey({
  eventType,
  paymentId,
  linkId,
  invoiceId,
  refundId,
}: {
  eventType: string;
  paymentId?: string | null;
  linkId?: string | null;
  invoiceId?: string | null;
  refundId?: string | null;
}) {
  return [
    "razorpay",
    "webhook",
    eventType,
    paymentId || "no-payment",
    linkId || "no-link",
    refundId || "no-refund",
    invoiceId || "no-invoice",
  ].join(":");
}

export async function createWebhookEventRecord(input: {
  provider: string;
  eventType: string;
  eventKey: string;
  signature?: string | null;
  externalEventId?: string | null;
  externalPaymentId?: string | null;
  externalLinkId?: string | null;
  externalRefundId?: string | null;
  workspaceId?: string | null;
  invoiceId?: string | null;
  payload?: Record<string, any> | null;
}) {
  return prisma.webhookEvent.upsert({
    where: { eventKey: input.eventKey },
    update: {
      signature: input.signature || undefined,
      externalEventId: input.externalEventId || undefined,
      externalPaymentId: input.externalPaymentId || undefined,
      externalLinkId: input.externalLinkId || undefined,
      externalRefundId: input.externalRefundId || undefined,
      workspaceId: input.workspaceId || undefined,
      invoiceId: input.invoiceId || undefined,
      payload: (input.payload || undefined) as any,
    },
    create: {
      provider: input.provider,
      eventType: input.eventType,
      eventKey: input.eventKey,
      signature: input.signature || undefined,
      externalEventId: input.externalEventId || undefined,
      externalPaymentId: input.externalPaymentId || undefined,
      externalLinkId: input.externalLinkId || undefined,
      externalRefundId: input.externalRefundId || undefined,
      workspaceId: input.workspaceId || undefined,
      invoiceId: input.invoiceId || undefined,
      status: "RECEIVED",
      payload: (input.payload || undefined) as any,
    },
  });
}

export async function finalizeWebhookEventRecord(
  id: string,
  status: WebhookEventStatus,
  updates?: {
    reason?: string | null;
    result?: Record<string, any> | null;
    workspaceId?: string | null;
    invoiceId?: string | null;
    externalPaymentId?: string | null;
    externalLinkId?: string | null;
    externalRefundId?: string | null;
  }
) {
  return prisma.webhookEvent.update({
    where: { id },
    data: {
      status,
      reason: updates?.reason || undefined,
      result: (updates?.result || undefined) as any,
      workspaceId: updates?.workspaceId || undefined,
      invoiceId: updates?.invoiceId || undefined,
      externalPaymentId: updates?.externalPaymentId || undefined,
      externalLinkId: updates?.externalLinkId || undefined,
      externalRefundId: updates?.externalRefundId || undefined,
      processedAt: new Date(),
    },
  });
}

export async function recordPaymentEvent(input: {
  provider: string;
  eventType: string;
  eventKey: string;
  direction: string;
  status: string;
  externalPaymentId?: string | null;
  externalLinkId?: string | null;
  externalRefundId?: string | null;
  workspaceId?: string | null;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, any> | null;
}) {
  return prisma.paymentEvent.upsert({
    where: { eventKey: input.eventKey },
    update: {
      status: input.status,
      externalPaymentId: input.externalPaymentId || undefined,
      externalLinkId: input.externalLinkId || undefined,
      externalRefundId: input.externalRefundId || undefined,
      workspaceId: input.workspaceId || undefined,
      invoiceId: input.invoiceId || undefined,
      subscriptionId: input.subscriptionId || undefined,
      amount: input.amount ?? undefined,
      currency: input.currency || undefined,
      metadata: (input.metadata || undefined) as any,
      processedAt: new Date(),
    },
    create: {
      provider: input.provider,
      eventType: input.eventType,
      eventKey: input.eventKey,
      direction: input.direction,
      status: input.status,
      externalPaymentId: input.externalPaymentId || undefined,
      externalLinkId: input.externalLinkId || undefined,
      externalRefundId: input.externalRefundId || undefined,
      workspaceId: input.workspaceId || undefined,
      invoiceId: input.invoiceId || undefined,
      subscriptionId: input.subscriptionId || undefined,
      amount: input.amount ?? undefined,
      currency: input.currency || undefined,
      metadata: (input.metadata || undefined) as any,
      processedAt: new Date(),
    },
  });
}

export async function createPaymentSecurityAudit(input: {
  action: string;
  workspaceId?: string | null;
  userId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId || "SYSTEM",
      workspaceId: input.workspaceId || null,
      action: input.action,
      resourceType: input.resourceType || null,
      resourceId: input.resourceId || null,
      metadata: (input.metadata || undefined) as any,
    },
  });
}
