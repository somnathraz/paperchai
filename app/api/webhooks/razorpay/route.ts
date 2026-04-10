import { NextRequest, NextResponse } from "next/server";
import { BillingProvider } from "@prisma/client";
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
import {
  applyWorkspaceSubscriptionFromPayment,
  getExpectedSubscriptionAmountPaise,
  mergeSubscriptionNotesFromPayload,
  parseWorkspaceSubscriptionNotes,
} from "@/lib/billing/subscription-checkout";
import { normalizePlanCode, BILLING_INTERVALS } from "@/lib/billing/plans";
import { provisionWorkspaceSubscription } from "@/lib/billing/subscriptions";

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

  const HANDLED_EVENTS = [
    "payment_link.paid",
    "payment_link.partially_paid",
    "payment.captured",
    "subscription.activated",
    "subscription.charged",
    "subscription.halted",
    "subscription.cancelled",
    "subscription.completed",
    "subscription.pending",
  ];

  if (!HANDLED_EVENTS.includes(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // --- Handle Subscription events ---
  if (event.startsWith("subscription.")) {
    const subEntity = payload?.payload?.subscription?.entity;
    const razorpaySubId = subEntity?.id as string | undefined;
    const workspaceIdFromNotes = subEntity?.notes?.workspaceId as string | undefined;

    if (!razorpaySubId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no_subscription_id" });
    }

    try {
      if (event === "subscription.activated") {
        // Find subscription by providerSubId
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
          include: { plan: true },
        });

        if (!subscription && workspaceIdFromNotes) {
          // Subscription might not have providerSubId set yet (race with activate endpoint)
          // Attempt to find by workspaceId
          const subByWorkspace = await prisma.subscription.findUnique({
            where: { workspaceId: workspaceIdFromNotes },
            include: { plan: true },
          });

          if (subByWorkspace) {
            const planCode = normalizePlanCode(subEntity?.notes?.planCode);
            const interval: (typeof BILLING_INTERVALS)[number] =
              subEntity?.notes?.billingInterval === "year" ? "year" : "month";
            const currency = subEntity?.notes?.billingCurrency === "USD" ? "USD" : ("INR" as const);

            const currentStart = subEntity?.current_start
              ? new Date(subEntity.current_start * 1000)
              : new Date();
            const currentEnd = subEntity?.current_end
              ? new Date(subEntity.current_end * 1000)
              : null;

            await provisionWorkspaceSubscription(workspaceIdFromNotes, {
              planCode,
              currency,
              interval,
            });

            await prisma.subscription.update({
              where: { workspaceId: workspaceIdFromNotes },
              data: {
                providerSubId: razorpaySubId,
                provider: BillingProvider.RAZORPAY,
                status: "ACTIVE",
                currentPeriodStart: currentStart,
                currentPeriodEnd: currentEnd,
              },
            });

            await prisma.auditLog.create({
              data: {
                userId: "SYSTEM",
                workspaceId: workspaceIdFromNotes,
                action: "BILLING_SUBSCRIPTION_UPGRADED",
                resourceType: "BILLING_SUBSCRIPTION",
                metadata: {
                  planCode,
                  interval,
                  currency,
                  razorpaySubscriptionId: razorpaySubId,
                  webhookEvent: event,
                  activationSource: "webhook_subscription_activated",
                  currentStart: currentStart.toISOString(),
                  currentEnd: currentEnd?.toISOString() || null,
                } as any,
              },
            });
          }
        }

        return NextResponse.json({ ok: true, event });
      }

      if (event === "subscription.charged") {
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
        });

        if (subscription) {
          // Extend period end. Use charge_at if available, else compute from current + interval
          const chargeAt = subEntity?.charge_at ? new Date(subEntity.charge_at * 1000) : new Date();
          const currentEnd = subEntity?.current_end ? new Date(subEntity.current_end * 1000) : null;

          const newPeriodEnd = currentEnd || chargeAt;
          const workspaceId = subscription.workspaceId;

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: newPeriodEnd,
              cancelAtPeriodEnd: false,
            },
          });

          await prisma.auditLog.create({
            data: {
              userId: "SYSTEM",
              workspaceId,
              action: "BILLING_SUBSCRIPTION_RENEWED",
              resourceType: "BILLING_SUBSCRIPTION",
              metadata: {
                razorpaySubscriptionId: razorpaySubId,
                webhookEvent: event,
                newPeriodEnd: newPeriodEnd.toISOString(),
              } as any,
            },
          });
        }

        return NextResponse.json({ ok: true, event });
      }

      if (event === "subscription.halted") {
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
          include: { workspace: true },
        });

        if (subscription) {
          const workspaceId = subscription.workspaceId;

          await provisionWorkspaceSubscription(workspaceId, { planCode: "FREE" });

          await prisma.auditLog.create({
            data: {
              userId: "SYSTEM",
              workspaceId,
              action: "BILLING_SUBSCRIPTION_PAYMENT_FAILED",
              resourceType: "BILLING_SUBSCRIPTION",
              metadata: {
                razorpaySubscriptionId: razorpaySubId,
                webhookEvent: event,
                downgradedTo: "FREE",
              } as any,
            },
          });
        }

        return NextResponse.json({ ok: true, event });
      }

      if (event === "subscription.cancelled") {
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
        });

        if (subscription) {
          const workspaceId = subscription.workspaceId;
          const now = new Date();
          const periodEnd = subscription.currentPeriodEnd;

          // If already past period end, downgrade immediately; otherwise mark cancelAtPeriodEnd
          if (!periodEnd || now >= periodEnd) {
            await provisionWorkspaceSubscription(workspaceId, { planCode: "FREE" });

            await prisma.auditLog.create({
              data: {
                userId: "SYSTEM",
                workspaceId,
                action: "BILLING_SUBSCRIPTION_CANCELLED_WEBHOOK",
                resourceType: "BILLING_SUBSCRIPTION",
                metadata: {
                  razorpaySubscriptionId: razorpaySubId,
                  webhookEvent: event,
                  downgradedImmediately: true,
                } as any,
              },
            });
          } else {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { cancelAtPeriodEnd: true },
            });

            await prisma.auditLog.create({
              data: {
                userId: "SYSTEM",
                workspaceId,
                action: "BILLING_SUBSCRIPTION_CANCELLED_WEBHOOK",
                resourceType: "BILLING_SUBSCRIPTION",
                metadata: {
                  razorpaySubscriptionId: razorpaySubId,
                  webhookEvent: event,
                  cancelAtPeriodEnd: true,
                  periodEnd: periodEnd.toISOString(),
                } as any,
              },
            });
          }
        }

        return NextResponse.json({ ok: true, event });
      }

      if (event === "subscription.completed") {
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
        });

        if (subscription) {
          const workspaceId = subscription.workspaceId;

          await provisionWorkspaceSubscription(workspaceId, { planCode: "FREE" });

          await prisma.auditLog.create({
            data: {
              userId: "SYSTEM",
              workspaceId,
              action: "BILLING_SUBSCRIPTION_COMPLETED",
              resourceType: "BILLING_SUBSCRIPTION",
              metadata: {
                razorpaySubscriptionId: razorpaySubId,
                webhookEvent: event,
                completedAt: new Date().toISOString(),
              } as any,
            },
          });
        }

        return NextResponse.json({ ok: true, event });
      }

      if (event === "subscription.pending") {
        // Info only — log and return
        const subscription = await prisma.subscription.findFirst({
          where: { providerSubId: razorpaySubId },
        });

        if (subscription) {
          await prisma.auditLog.create({
            data: {
              userId: "SYSTEM",
              workspaceId: subscription.workspaceId,
              action: "BILLING_SUBSCRIPTION_PENDING",
              resourceType: "BILLING_SUBSCRIPTION",
              metadata: {
                razorpaySubscriptionId: razorpaySubId,
                webhookEvent: event,
              } as any,
            },
          });
        }

        return NextResponse.json({ ok: true, event });
      }

      return NextResponse.json({ ok: true, event });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription webhook failed";
      console.error("[Razorpay webhook] Subscription event handling failed:", {
        event,
        razorpaySubId,
        message,
      });
      return NextResponse.json({ error: message }, { status: 422 });
    }
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

  const mergedNotes = mergeSubscriptionNotesFromPayload(paymentLinkEntity, paymentEntity);
  const subscriptionCheckout = parseWorkspaceSubscriptionNotes(mergedNotes);

  if (subscriptionCheckout && !invoiceId && workspaceId === subscriptionCheckout.workspaceId) {
    const effectivePaymentId =
      paymentId || (linkId ? `link_${linkId}` : null) || `sub-${webhookEvent.id}`;
    const paidPaise = Number(
      paymentEntity?.amount ?? paymentLinkEntity?.amount ?? paymentLinkEntity?.amount_paid ?? 0
    );
    const subEventKey = `razorpay:workspace_subscription:${effectivePaymentId}:${subscriptionCheckout.workspaceId}`;
    const existingSubPayment = await prisma.paymentEvent.findUnique({
      where: { eventKey: subEventKey },
    });
    if (existingSubPayment?.status === "PAID") {
      await finalizeWebhookEventRecord(webhookEvent.id, "DUPLICATE", {
        reason: "subscription_payment_duplicate",
        result: { duplicate: true },
        workspaceId,
        invoiceId: null,
        externalPaymentId: paymentId,
        externalLinkId: linkId,
        externalRefundId: refundId,
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const planCode = normalizePlanCode(subscriptionCheckout.planCode);
    const expectedPaise = getExpectedSubscriptionAmountPaise(
      planCode,
      subscriptionCheckout.billingCurrency,
      subscriptionCheckout.billingInterval
    );

    if (paidPaise <= 0 || paidPaise !== expectedPaise) {
      await finalizeWebhookEventRecord(webhookEvent.id, "IGNORED", {
        reason: "subscription_amount_mismatch",
        result: {
          ignored: true,
          expectedPaise,
          paidPaise,
          planCode,
        },
        workspaceId,
        invoiceId: null,
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
          reason: "subscription_amount_mismatch",
          event,
          expectedPaise,
          paidPaise,
          planCode,
        },
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "subscription_amount_mismatch" });
    }

    try {
      await applyWorkspaceSubscriptionFromPayment({
        workspaceId: subscriptionCheckout.workspaceId,
        planCode,
        currency: subscriptionCheckout.billingCurrency,
        interval: subscriptionCheckout.billingInterval,
        expectedAmountPaise: expectedPaise,
        paidAmountPaise: paidPaise,
        paymentId,
        linkId,
        webhookEventId: webhookEvent.id,
      });

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      if (subscriptionCheckout.billingInterval === "year") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      await prisma.subscription.update({
        where: { workspaceId: subscriptionCheckout.workspaceId },
        data: { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
      });

      await recordPaymentEvent({
        provider: "razorpay",
        eventType: event,
        eventKey: subEventKey,
        direction: "INBOUND",
        status: "PAID",
        externalPaymentId: paymentId,
        externalLinkId: linkId,
        workspaceId: subscriptionCheckout.workspaceId,
        invoiceId: null,
        amount: paidPaise,
        currency: subscriptionCheckout.billingCurrency,
        metadata: {
          kind: "workspace_subscription",
          planCode,
          webhookEventId: webhookEvent.id,
        },
      });

      await finalizeWebhookEventRecord(webhookEvent.id, "PROCESSED", {
        reason: null,
        result: {
          subscription: true,
          planCode,
          amountPaise: paidPaise,
          upgraded: true,
        },
        workspaceId,
        invoiceId: null,
        externalPaymentId: paymentId,
        externalLinkId: linkId,
        externalRefundId: refundId,
      });

      return NextResponse.json({ ok: true, subscription: true, upgraded: true, planCode });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription webhook failed";
      console.error("Razorpay subscription webhook failed:", { event, workspaceId, message });
      await finalizeWebhookEventRecord(webhookEvent.id, "FAILED", {
        reason: "subscription_processing_failed",
        result: { error: message },
        workspaceId,
        invoiceId: null,
        externalPaymentId: paymentId,
        externalLinkId: linkId,
        externalRefundId: refundId,
      });
      await createPaymentSecurityAudit({
        action: "PAYMENT_WEBHOOK_FAILED",
        workspaceId,
        resourceType: "WEBHOOK",
        resourceId: webhookEvent.id,
        metadata: {
          provider: "razorpay",
          reason: "subscription_processing_failed",
          event,
          paymentId,
          linkId,
          error: message,
        },
      });
      return NextResponse.json({ error: message }, { status: 422 });
    }
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
