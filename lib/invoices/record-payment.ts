import { prisma } from "@/lib/prisma";
import { stopInvoiceRemindersOnFullPayment } from "@/lib/invoices/payment-tracking";

type RecordInvoicePaymentInput = {
  invoiceId: string;
  workspaceId: string;
  amount: number;
  paidAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNote?: string;
  externalMeta?: Record<string, any>;
};

export async function recordInvoicePayment({
  invoiceId,
  workspaceId,
  amount,
  paidAt = new Date(),
  paymentMethod,
  paymentReference,
  paymentNote,
  externalMeta,
}: RecordInvoicePaymentInput) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    select: {
      id: true,
      status: true,
      total: true,
      amountPaid: true,
      allowPartialPayments: true,
      paymentReference: true,
      sendMeta: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (
    invoice.status === "cancelled" ||
    invoice.status === "draft" ||
    invoice.status === "scheduled"
  ) {
    throw new Error(`Cannot record payment for ${invoice.status} invoice`);
  }

  const total = Number(invoice.total);
  const existingPaid = Number(invoice.amountPaid || 0);
  const existingSendMeta = ((invoice.sendMeta as Record<string, any>) || {}) as Record<string, any>;
  const existingGatewayMeta = (existingSendMeta.paymentGateway || {}) as Record<string, any>;
  const processedPaymentIds = Array.isArray(existingGatewayMeta.processedPaymentIds)
    ? existingGatewayMeta.processedPaymentIds.map(String)
    : [];

  if (
    paymentReference &&
    (invoice.paymentReference === paymentReference ||
      processedPaymentIds.includes(paymentReference))
  ) {
    return {
      duplicate: true,
      fullyPaid: existingPaid >= total,
      invoice,
      balanceDue: Math.max(0, total - existingPaid),
    };
  }

  const nextAmountPaid = existingPaid + amount;

  if (!invoice.allowPartialPayments && nextAmountPaid < total) {
    throw new Error("Partial payments are disabled for this invoice");
  }

  if (nextAmountPaid - total > 0.0001) {
    throw new Error("Payment exceeds invoice balance");
  }

  const fullyPaid = nextAmountPaid >= total;
  const nextGatewayMeta = externalMeta
    ? {
        ...existingGatewayMeta,
        ...externalMeta,
        ...(paymentReference
          ? {
              processedPaymentIds: Array.from(
                new Set([...processedPaymentIds, paymentReference].slice(-20))
              ),
            }
          : {}),
      }
    : existingGatewayMeta;

  const nextSendMeta = {
    ...existingSendMeta,
    ...(externalMeta ? { paymentGateway: nextGatewayMeta } : {}),
  };

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: nextAmountPaid,
      paidAt: fullyPaid ? paidAt : null,
      paymentMethod: paymentMethod || undefined,
      paymentReference: paymentReference || undefined,
      paymentNote: paymentNote || undefined,
      sendMeta: nextSendMeta,
      status: fullyPaid ? "paid" : invoice.status === "overdue" ? "overdue" : "sent",
    },
  });

  if (fullyPaid) {
    await stopInvoiceRemindersOnFullPayment(invoice.id, workspaceId);
  }

  await prisma.reminderHistory.create({
    data: {
      workspaceId,
      invoiceId: invoice.id,
      kind: "payment",
      channel: "email",
      status: fullyPaid ? "paid" : "partial_paid",
      sentAt: paidAt,
    },
  });

  return {
    duplicate: false,
    fullyPaid,
    invoice: updated,
    balanceDue: Math.max(0, Number(updated.total) - Number(updated.amountPaid)),
  };
}
