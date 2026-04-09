import { sendEmail } from "@/lib/email";
import { buildAppUrl } from "@/lib/app-url";

// ── Payment received (workspace owner notification) ─────────────────────────

export async function sendPaymentReceivedEmail(opts: {
  ownerEmail: string;
  ownerName: string;
  workspaceName: string;
  invoiceNumber: string;
  invoiceId: string;
  clientName: string;
  amount: number;
  currency: string;
  fullyPaid: boolean;
}) {
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: opts.currency,
    minimumFractionDigits: 0,
  });
  const amountStr = fmt.format(opts.amount);
  const invoiceUrl = buildAppUrl(`/invoices/new?id=${opts.invoiceId}`);
  const label = opts.fullyPaid ? "fully paid" : "partially paid";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px">
        <!-- header -->
        <tr><td style="background:#0f172a;padding:28px 32px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff">💰 Payment received</p>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8">${opts.workspaceName}</p>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">Hi ${opts.ownerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#1e293b">
            <strong>${opts.clientName}</strong> has ${label} invoice
            <strong>${opts.invoiceNumber}</strong>.
          </p>
          <!-- amount box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px;text-align:center">
              <p style="margin:0;font-size:13px;color:#15803d">Amount received</p>
              <p style="margin:4px 0 0;font-size:32px;font-weight:700;color:#166534">${amountStr}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#16a34a;text-transform:uppercase;letter-spacing:.08em">
                ${opts.fullyPaid ? "Invoice fully settled ✓" : "Partial payment"}
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${invoiceUrl}"
                 style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
                View invoice →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">PaperChai · Invoice management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: opts.ownerEmail,
    subject: `💰 Payment received: ${opts.invoiceNumber} from ${opts.clientName}`,
    html,
  });
}

// ── Subscription cancelled ───────────────────────────────────────────────────

export async function sendSubscriptionCancelledEmail(opts: {
  ownerEmail: string;
  ownerName: string;
  workspaceName: string;
  previousPlan: string;
  cancelledAt: Date;
  refundableAmount: number;
  currency: string;
}) {
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: opts.currency,
    minimumFractionDigits: 0,
  });
  const refundStr = fmt.format(opts.refundableAmount / 100);
  const cancelDate = opts.cancelledAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const billingUrl = buildAppUrl("/settings/billing");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px">
        <tr><td style="background:#0f172a;padding:28px 32px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff">Subscription cancelled</p>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8">${opts.workspaceName}</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">Hi ${opts.ownerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#1e293b">
            Your <strong>${opts.previousPlan}</strong> plan has been cancelled and your workspace
            has been moved to the <strong>Free plan</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
              <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em">Cancelled on</p>
              <p style="margin:2px 0 0;font-size:14px;color:#1e293b;font-weight:600">${cancelDate}</p>
            </td></tr>
            ${
              opts.refundableAmount > 0
                ? `<tr><td style="padding:16px 20px">
              <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em">Prorated refund</p>
              <p style="margin:2px 0 0;font-size:14px;color:#16a34a;font-weight:600">${refundStr}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#64748b">Refunds are processed within 5–7 business days.</p>
            </td></tr>`
                : `<tr><td style="padding:16px 20px">
              <p style="margin:0;font-size:12px;color:#64748b">No refund applicable for this cancellation.</p>
            </td></tr>`
            }
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#64748b">
            You can upgrade again at any time to re-enable all premium features.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${billingUrl}"
                 style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
                View billing →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">PaperChai · Invoice management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: opts.ownerEmail,
    subject: `Your ${opts.previousPlan} subscription has been cancelled`,
    html,
  });
}

// ── Subscription upgraded ────────────────────────────────────────────────────

export async function sendSubscriptionUpgradedEmail(opts: {
  ownerEmail: string;
  ownerName: string;
  workspaceName: string;
  newPlan: string;
  billingInterval: "month" | "year";
  amount: number;
  currency: string;
}) {
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: opts.currency,
    minimumFractionDigits: 0,
  });
  const amountStr = fmt.format(opts.amount / 100);
  const billingUrl = buildAppUrl("/settings/billing");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px">
        <tr><td style="background:#0f172a;padding:28px 32px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff">🎉 Welcome to ${opts.newPlan}!</p>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8">${opts.workspaceName}</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">Hi ${opts.ownerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#1e293b">
            Your workspace has been upgraded to the <strong>${opts.newPlan}</strong> plan.
            All premium features are now active.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px;text-align:center">
              <p style="margin:0;font-size:13px;color:#0369a1">Billed ${opts.billingInterval === "year" ? "annually" : "monthly"}</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#0c4a6e">${amountStr}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#0284c7">per ${opts.billingInterval}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${billingUrl}"
                 style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
                View your plan →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">PaperChai · Invoice management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: opts.ownerEmail,
    subject: `🎉 You're now on ${opts.newPlan} — welcome!`,
    html,
  });
}
