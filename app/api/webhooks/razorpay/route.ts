import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import {
  buildRazorpayWebhookEventKey,
  createPaymentSecurityAudit,
  createWebhookEventRecord,
  finalizeWebhookEventRecord,
  recordPaymentEvent,
} from "@/lib/payments/provider-events";
import { recordInvoicePayment } from "@/lib/invoices/record-payment";
import { sendPaymentReceivedEmail } from "@/lib/billing/emails";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  try {
    const valid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!valid) {
      await createPaymentSecurityAudit({
        action: "PAYMENT_WEBHOOK_REJECTED",
        resourceType: "WEBHOOK",
        metadata: {
          provider: "razorpay",
          reason: "invalid_signature",
        },
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed" },
      { status: 503 }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_REJECTED",
      resourceType: "WEBHOOK",
      metadata: {
        provider: "razorpay",
        reason: "invalid_json",
      },
    });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const event = payload?.event as string | undefined;

  if (!event) {
    return NextResponse.json({ error: "Missing event" }, { status: 422 });
  }

  if (!["payment_link.paid", "payment_link.partially_paid", "payment.captured"].includes(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const paymentLinkEntity =
    payload?.payload?.payment_link?.entity || payload?.payload?.payment_link?.payment_link || null;
  const paymentEntity = payload?.payload?.payment?.entity || null;
  const paymentId = paymentEntity?.id || paymentLinkEntity?.id || null;
  const linkId = paymentLinkEntity?.id || null;
  const refundId = payload?.payload?.refund?.entity?.id || null;

  const invoiceId = paymentLinkEntity?.notes?.invoiceId || paymentEntity?.notes?.invoiceId || null;
  const workspaceId =
    paymentLinkEntity?.notes?.workspaceId || paymentEntity?.notes?.workspaceId || null;
  const eventKey = buildRazorpayWebhookEventKey({
    eventType: event,
    paymentId,
    linkId,
    invoiceId,
    refundId,
  });
  const webhookEvent = await createWebhookEventRecord({
    provider: "razorpay",
    eventType: event,
    eventKey,
    signature,
    externalPaymentId: paymentId,
    externalLinkId: linkId,
    externalRefundId: refundId,
    workspaceId,
    invoiceId,
    payload,
  });

  if (webhookEvent.status === "PROCESSED" || webhookEvent.status === "DUPLICATE") {
    await finalizeWebhookEventRecord(webhookEvent.id, "DUPLICATE", {
      reason: "webhook_duplicate",
      result: { duplicate: true },
      workspaceId,
      invoiceId,
      externalPaymentId: paymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!invoiceId || !workspaceId) {
    await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
      reason: "invoice_notes_missing",
      result: { ignored: true },
      workspaceId,
      invoiceId,
      externalPaymentId: paymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_REJECTED",
      workspaceId,
      resourceType: "WEBHOOK",
      resourceId: webhookEvent.id,
      metadata: {
        provider: "razorpay",
        reason: "invoice_notes_missing",
        event,
        paymentId,
        linkId,
      },
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "invoice_notes_missing" });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    select: {
      id: true,
      number: true,
      currency: true,
      amountPaid: true,
      sendMeta: true,
      paymentReference: true,
      paymentLinkUrl: true,
      client: { select: { name: true } },
      workspace: {
        select: {
          name: true,
          members: {
            where: { role: "OWNER", removedAt: null },
            take: 1,
            select: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!invoice) {
    await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
      reason: "invoice_not_found",
      result: { ignored: true },
      workspaceId,
      invoiceId,
      externalPaymentId: paymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_REJECTED",
      workspaceId,
      resourceType: "INVOICE",
      resourceId: invoiceId,
      metadata: {
        provider: "razorpay",
        reason: "invoice_not_found",
        event,
        paymentId,
        linkId,
      },
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "invoice_not_found" });
  }

  const gatewayMeta = (((invoice.sendMeta as Record<string, any>) || {}).paymentGateway ||
    {}) as Record<string, any>;
  const expectedLinkId = gatewayMeta.linkId ? String(gatewayMeta.linkId) : null;
  const incomingLinkId = paymentLinkEntity?.id ? String(paymentLinkEntity.id) : null;
  if (expectedLinkId && incomingLinkId && expectedLinkId !== incomingLinkId) {
    await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
      reason: "payment_link_mismatch",
      result: {
        ignored: true,
        expectedLinkId,
        incomingLinkId,
      },
      workspaceId,
      invoiceId,
      externalPaymentId: paymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_REJECTED",
      workspaceId,
      resourceType: "INVOICE",
      resourceId: invoiceId,
      metadata: {
        provider: "razorpay",
        reason: "payment_link_mismatch",
        event,
        expectedLinkId,
        incomingLinkId,
        paymentId,
      },
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "payment_link_mismatch" });
  }
  if (!expectedLinkId && !invoice.paymentLinkUrl) {
    await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
      reason: "gateway_binding_missing",
      result: { ignored: true },
      workspaceId,
      invoiceId,
      externalPaymentId: paymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_REJECTED",
      workspaceId,
      resourceType: "INVOICE",
      resourceId: invoiceId,
      metadata: {
        provider: "razorpay",
        reason: "gateway_binding_missing",
        event,
        paymentId,
        linkId,
      },
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "gateway_binding_missing" });
  }
  const effectivePaymentId = paymentId || `${event}-${invoiceId}`;
  const paymentAmountMajor = Number(paymentEntity?.amount || 0) / 100;

  if (paymentAmountMajor <= 0) {
    await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
      reason: "payment_amount_missing",
      result: { ignored: true },
      workspaceId,
      invoiceId,
      externalPaymentId: effectivePaymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "payment_amount_missing" });
  }

  try {
    const result = await recordInvoicePayment({
      invoiceId,
      workspaceId,
      amount: paymentAmountMajor,
      paidAt: paymentEntity?.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
      paymentMethod: "Razorpay",
      paymentReference: effectivePaymentId,
      paymentNote: event,
      externalMeta: {
        provider: "razorpay",
        linkId: paymentLinkEntity?.id || null,
        paymentId: effectivePaymentId,
        status: paymentLinkEntity?.status || paymentEntity?.status || null,
        webhookEvent: event,
        webhookProcessedAt: new Date().toISOString(),
      },
    });

    await finalizeWebhookEventRecord(
      webhookEvent.id,
      result.duplicate ? "DUPLICATE" : "PROCESSED",
      {
        reason: result.duplicate ? "duplicate_payment_reference" : null,
        result: {
          duplicate: result.duplicate,
          fullyPaid: result.fullyPaid,
          amount: paymentAmountMajor,
        },
        workspaceId,
        invoiceId,
        externalPaymentId: effectivePaymentId,
        externalLinkId: linkId,
        externalRefundId: refundId,
      }
    );
    // Send payment received email to workspace owner (fire-and-forget)
    if (!result.duplicate) {
      const owner = invoice.workspace?.members?.[0]?.user;
      if (owner?.email) {
        sendPaymentReceivedEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || owner.email.split("@")[0],
          workspaceName: invoice.workspace?.name || "Your workspace",
          invoiceNumber: invoice.number,
          invoiceId: invoiceId,
          clientName: invoice.client?.name || "Client",
          amount: paymentAmountMajor,
          currency: invoice.currency || "INR",
          fullyPaid: result.fullyPaid,
        }).catch((err) => console.error("[Razorpay webhook] Failed to send payment email:", err));
      }
    }

    await recordPaymentEvent({
      provider: "razorpay",
      eventType: event,
      eventKey: `razorpay:payment:${effectivePaymentId}:${event}`,
      direction: "INBOUND",
      status: result.duplicate ? "DUPLICATE" : result.fullyPaid ? "PAID" : "PARTIAL",
      externalPaymentId: effectivePaymentId,
      externalLinkId: linkId,
      workspaceId,
      invoiceId,
      amount: Math.round(paymentAmountMajor * 100),
      currency: paymentEntity?.currency || paymentLinkEntity?.currency || "INR",
      metadata: {
        webhookEventId: webhookEvent.id,
        duplicate: result.duplicate,
        fullyPaid: result.fullyPaid,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      fullyPaid: result.fullyPaid,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Razorpay webhook processing failed:", { event, invoiceId, message });
    await finalizeWebhookEventRecord(webhookEvent.id, "FAILED", {
      reason: "processing_failed",
      result: { error: message },
      workspaceId,
      invoiceId,
      externalPaymentId: effectivePaymentId,
      externalLinkId: linkId,
      externalRefundId: refundId,
    });
    await createPaymentSecurityAudit({
      action: "PAYMENT_WEBHOOK_FAILED",
      workspaceId,
      resourceType: "INVOICE",
      resourceId: invoiceId,
      metadata: {
        provider: "razorpay",
        event,
        paymentId: effectivePaymentId,
        linkId,
        error: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
