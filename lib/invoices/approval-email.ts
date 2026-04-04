import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getWorkspaceApprovers } from "@/lib/invoices/approval-routing";
import { buildAppUrl } from "@/lib/app-url";

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
      workspace: true,
    },
  });

  if (!invoice) {
    return false;
  }

  const approvers = await getWorkspaceApprovers(invoice.workspaceId);
  if (approvers.length === 0) {
    return false;
  }

  const primaryApprover = approvers[0];
  const primaryName = primaryApprover.name || primaryApprover.email.split("@")[0] || "there";
  const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
  const amountLabel = formatCurrency(Number(total || 0), invoice.currency || "INR");
  const dueLabel = formatDate(invoice.dueDate);
  const approvalUrl = buildAppUrl(`/invoices/new?id=${invoice.id}`);

  const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
            <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 12px; color: #0f172a;">Invoice approval needed</h2>
                <p style="margin: 0 0 16px; color: #475569;">
                    Hi ${primaryName}, an invoice was created by automation and needs approval before it is sent.
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
                    Sent to ${approvers.length} approver${approvers.length > 1 ? "s" : ""}. Once approved, automation continues based on schedule.
                </p>
            </div>
        </div>
    `;

  let sentCount = 0;
  for (const approver of approvers) {
    const sent = await sendEmail({
      to: approver.email,
      subject: `Approval needed: Invoice ${invoice.number}`,
      html,
      from: invoice.workspace.registeredEmail || undefined,
    });
    if (sent) sentCount += 1;
  }

  return sentCount > 0;
}

type EscalationOptions = {
  ageHours: number;
  escalationCount: number;
};

export async function sendAutomationApprovalEscalationEmail(
  invoiceId: string,
  options: EscalationOptions
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: { select: { name: true } },
      workspace: true,
    },
  });

  if (!invoice) {
    return false;
  }

  const approvers = await getWorkspaceApprovers(invoice.workspaceId);
  if (approvers.length === 0) {
    return false;
  }

  const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
  const amountLabel = formatCurrency(Number(total || 0), invoice.currency || "INR");
  const dueLabel = formatDate(invoice.dueDate);
  const reviewUrl = buildAppUrl(`/invoices/new?id=${invoice.id}`);

  const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
            <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 12px; color: #7c2d12;">Approval escalation: pending invoice</h2>
                <p style="margin: 0 0 16px; color: #475569;">
                    This invoice has been waiting for approval for ${options.ageHours} hour${options.ageHours === 1 ? "" : "s"}.
                </p>
                <div style="padding: 16px; border-radius: 10px; background: #fff7ed; margin-bottom: 16px;">
                    <p style="margin: 0 0 6px; color: #7c2d12; font-weight: 600;">Invoice ${invoice.number}</p>
                    <p style="margin: 0; color: #9a3412;">Client: ${invoice.client?.name || "Unknown"}</p>
                    <p style="margin: 0; color: #9a3412;">Amount: ${amountLabel}</p>
                    <p style="margin: 0; color: #9a3412;">Due: ${dueLabel}</p>
                    <p style="margin: 8px 0 0; color: #b45309; font-size: 12px;">Escalation #${options.escalationCount}</p>
                </div>
                <a href="${reviewUrl}" style="display: inline-block; padding: 12px 18px; background: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Review approval queue
                </a>
            </div>
        </div>
    `;

  let sentCount = 0;
  for (const approver of approvers) {
    const sent = await sendEmail({
      to: approver.email,
      subject: `Escalation: Invoice ${invoice.number} still pending approval`,
      html,
      from: invoice.workspace.registeredEmail || undefined,
    });
    if (sent) sentCount += 1;
  }

  return sentCount > 0;
}
