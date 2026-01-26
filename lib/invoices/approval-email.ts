import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const formatDate = (date?: Date | null) => {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export async function sendAutomationApprovalEmail(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: { select: { name: true } },
      workspace: {
        include: {
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invoice?.workspace?.owner?.email) {
    return false;
  }

  const ownerName =
    invoice.workspace.owner.name || invoice.workspace.owner.email.split("@")[0] || "there";
  const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
  const amountLabel = formatCurrency(Number(total || 0), invoice.currency || "INR");
  const dueLabel = formatDate(invoice.dueDate);
  const approvalUrl = `${getBaseUrl()}/invoices/new?id=${invoice.id}`;

  const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
            <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 12px; color: #0f172a;">Invoice approval needed</h2>
                <p style="margin: 0 0 16px; color: #475569;">
                    Hi ${ownerName}, an invoice was created by automation and needs your approval before it is sent.
                </p>
                <div style="padding: 16px; border-radius: 10px; background: #f1f5f9; margin-bottom: 16px;">
                    <p style="margin: 0 0 6px; color: #0f172a; font-weight: 600;">Invoice ${invoice.number}</p>
                    <p style="margin: 0; color: #475569;">Client: ${invoice.client?.name || "Unknown"}</p>
                    <p style="margin: 0; color: #475569;">Amount: ${amountLabel}</p>
                    <p style="margin: 0; color: #475569;">Due: ${dueLabel}</p>
                </div>
                <a href="${approvalUrl}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Review and approve
                </a>
                <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">
                    Once approved, automation will continue based on the scheduled send time.
                </p>
            </div>
        </div>
    `;

  return sendEmail({
    to: invoice.workspace.owner.email,
    subject: `Approval needed: Invoice ${invoice.number}`,
    html,
    from: invoice.workspace.registeredEmail || undefined,
  });
}
