import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getThemeHtml } from "@/lib/email-themes";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";

type SendInvoiceEmailOptions = {
  invoiceId: string;
  workspaceId: string;
  channel?: "email" | "whatsapp" | "both";
  notes?: string;
  sendMeta?: Record<string, any>;
  approvedBy?: string;
};

export async function sendInvoiceEmail({
  invoiceId,
  workspaceId,
  channel = "email",
  notes,
  sendMeta,
  approvedBy,
}: SendInvoiceEmailOptions) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: {
      client: true,
      workspace: {
        include: { owner: true },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (!invoice.client?.email) {
    throw new Error("Client email not found. Please add client email before sending.");
  }

  let emailTemplate = await prisma.emailTemplate.findFirst({
    where: {
      workspaceId,
      slug: "invoice-send",
    },
  });

  if (!emailTemplate) {
    emailTemplate = await prisma.emailTemplate.findFirst({
      where: {
        workspaceId,
        slug: { in: ["reminder-initial", "initial"] },
      },
    });
  }

  const formattedAmount = `${invoice.currency} ${Number(invoice.total).toLocaleString()}`;
  const formattedDueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Upon receipt";

  const templateVars: TemplateVars = {
    clientName: invoice.client.name || "Valued Customer",
    invoiceId: invoice.number || invoice.id,
    amount: formattedAmount,
    dueDate: formattedDueDate,
    companyName: invoice.workspace.name || "Your Company",
    paymentLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pay/${invoice.id}`,
  };

  let emailSubject: string;
  let emailBody: string;
  let brandColor = "#0f172a";
  let theme: "minimal" | "classic" | "modern" | "noir" = "modern";
  let logoUrl: string | undefined;

  if (emailTemplate) {
    emailSubject = replaceTemplateVariables(emailTemplate.subject, templateVars);
    emailBody = replaceTemplateVariables(emailTemplate.body, templateVars);
    brandColor = emailTemplate.brandColor || "#0f172a";
    theme = (emailTemplate.theme as typeof theme) || "modern";
    logoUrl = emailTemplate.logoUrl || undefined;
  } else {
    emailSubject = `Invoice ${invoice.number} from ${invoice.workspace.name}`;
    emailBody = `Dear {{clientName}},

Please find attached your invoice {{invoiceId}} for {{amount}}.

Due Date: {{dueDate}}

You can view and pay this invoice online:
{{paymentLink}}

Thank you for your business!

Best regards,
{{companyName}}`;
    emailBody = replaceTemplateVariables(emailBody, templateVars);
  }

  const themedHtml = getThemeHtml(theme, {
    subject: emailSubject,
    body: emailBody,
    brandColor,
    logoUrl,
    ...templateVars,
  });

  const emailSent = await sendEmail({
    to: invoice.client.email,
    subject: emailSubject,
    html: themedHtml,
    from: invoice.workspace.registeredEmail || undefined,
  });

  if (!emailSent) {
    throw new Error("Failed to send email. Please check your email configuration.");
  }

  const existingSendMeta = (invoice.sendMeta as Record<string, any>) || {};
  const overrideAutomation = sendMeta?.automation ? { ...sendMeta.automation } : undefined;
  const baseAutomation = existingSendMeta.automation
    ? { ...existingSendMeta.automation }
    : undefined;
  let nextAutomation = overrideAutomation
    ? { ...baseAutomation, ...overrideAutomation }
    : baseAutomation;
  if (nextAutomation && approvedBy && nextAutomation.approvalStatus === "PENDING") {
    nextAutomation.approvalStatus = "APPROVED";
    nextAutomation.approvedAt = new Date().toISOString();
    nextAutomation.approvedBy = approvedBy;
  }

  const nextSendMeta = {
    ...existingSendMeta,
    ...sendMeta,
    templateSlug: emailTemplate?.slug || "default",
    notes,
    ...(nextAutomation ? { automation: nextAutomation } : {}),
  };

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "sent",
      lastSentAt: new Date(),
      deliveryChannel: channel,
      sendMeta: nextSendMeta,
    },
  });

  await prisma.reminderHistory.create({
    data: {
      workspaceId,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      invoiceId: invoice.id,
      channel: (channel || "email") as "email" | "whatsapp" | "both",
      kind: "send",
      status: "sent",
      sentAt: new Date(),
      previewToUser: true,
      tone: "Warm",
    },
  });

  return {
    invoice: updatedInvoice,
    sentTo: invoice.client.email,
    templateUsed: emailTemplate?.slug || "default",
  };
}
