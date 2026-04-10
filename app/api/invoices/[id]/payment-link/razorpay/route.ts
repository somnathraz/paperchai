import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { createRazorpayPaymentLink, getRazorpayPublicConfig } from "@/lib/payments/razorpay";
import { buildAppUrl } from "@/lib/app-url";

const RAZORPAY_MIN_LINK_LIFETIME_SECONDS = 15 * 60;
const RAZORPAY_DEFAULT_LINK_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function getInvoicePaymentLinkExpiry(dueDate?: Date | null) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const minimumValidExpiry = nowSeconds + RAZORPAY_MIN_LINK_LIFETIME_SECONDS;

  if (dueDate) {
    const dueDateSeconds = Math.floor(dueDate.getTime() / 1000);
    if (Number.isFinite(dueDateSeconds) && dueDateSeconds >= minimumValidExpiry) {
      return dueDateSeconds;
    }
  }

  return nowSeconds + RAZORPAY_DEFAULT_LINK_LIFETIME_SECONDS;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership || !canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkRateLimitByProfile(req, "general", `ws:${workspace.id}:razorpay-link`);
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

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      client: true,
      workspace: { include: { settings: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!["draft", "sent", "overdue", "scheduled"].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot create payment link for ${invoice.status} invoice` },
      { status: 409 }
    );
  }

  const total = Number(invoice.total || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Math.max(0, total - amountPaid);

  if (balanceDue <= 0) {
    return NextResponse.json({ error: "Invoice balance is already settled" }, { status: 409 });
  }

  const existingGateway = ((invoice.sendMeta as Record<string, any>) || {}).paymentGateway || {};
  if (
    invoice.paymentLinkUrl &&
    existingGateway.provider === "razorpay" &&
    existingGateway.status !== "expired"
  ) {
    return NextResponse.json({
      ok: true,
      reused: true,
      paymentLinkUrl: invoice.paymentLinkUrl,
      gateway: existingGateway,
    });
  }

  const referenceId = `pc_${invoice.id.slice(-24)}`;
  const link = await createRazorpayPaymentLink({
    amount: Math.round(balanceDue * 100),
    currency: invoice.currency || "INR",
    description: `Invoice ${invoice.number} from ${workspace.name}`,
    reference_id: referenceId,
    expire_by: getInvoicePaymentLinkExpiry(invoice.dueDate),
    customer: {
      name: invoice.client?.name || undefined,
      email: invoice.client?.email || undefined,
      contact: invoice.client?.phone || undefined,
    },
    notify: {
      email: false,
      sms: false,
    },
    reminder_enable: true,
    notes: {
      invoiceId: invoice.id,
      workspaceId: workspace.id,
      invoiceNumber: invoice.number,
    },
    accept_partial: Boolean(invoice.allowPartialPayments),
    callback_url: buildAppUrl(`/pay/${invoice.id}?payment=success`),
    callback_method: "get",
  });

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paymentMethod: "Razorpay",
      paymentLinkUrl: link.short_url,
      sendMeta: {
        ...((invoice.sendMeta as Record<string, any>) || {}),
        paymentGateway: {
          provider: "razorpay",
          linkId: link.id,
          referenceId,
          status: link.status,
          amount: link.amount,
          currency: link.currency,
          shortUrl: link.short_url,
          generatedAt: new Date().toISOString(),
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    paymentLinkUrl: updatedInvoice.paymentLinkUrl,
    gateway: ((updatedInvoice.sendMeta as Record<string, any>) || {}).paymentGateway || null,
  });
}
