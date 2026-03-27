import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getThemeHtml } from "@/lib/email-themes";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";
import { generateInvoicePdf } from "./pdf-generation";
import { uploadInvoicePdf } from "@/lib/r2";
import { buildAppUrl } from "@/lib/app-url";

type SendInvoiceEmailOptions = {
  invoiceId: string;
  workspaceId: string;
  channel?: "email" | "whatsapp" | "both";
  notes?: string;
  recipientEmail?: string;
  sendMeta?: Record<string, any>;
  approvedBy?: string;
};

export async function sendInvoiceEmail({
  invoiceId,
  workspaceId,
  channel = "email",
  notes,
  recipientEmail,
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

  const resolvedRecipientEmail = recipientEmail?.trim() || invoice.client?.email || undefined;

  if (!resolvedRecipientEmail) {
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
    paymentLink: invoice.paymentLinkUrl || buildAppUrl(`/pay/${invoice.id}`),
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

  // Generate PDF and Upload to R2
  let attachments: any[] | undefined = undefined;
  let pdfKey: string | undefined = undefined;

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).host
      : "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const pdfBuffer = await generateInvoicePdf(invoice.id, baseUrl);
    pdfKey = await uploadInvoicePdf(invoice.id, pdfBuffer);

    attachments = [
      {
        filename: `invoice-${invoice.number || invoice.id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];
  } catch (pdfError) {
    console.error("Failed to generate or upload PDF:", pdfError);
    // Continue without attachment if PDF fails (optional behavior, could also throw)
  }

  const emailSent = await sendEmail({
    to: resolvedRecipientEmail,
    subject: emailSubject,
    html: themedHtml,
    from: invoice.workspace.registeredEmail || undefined,
    attachments,
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
      scheduledSendAt: null,
      lastSentAt: new Date(),
      deliveryChannel: channel,
      sendMeta: nextSendMeta,
      pdfKey: pdfKey || invoice.pdfKey,
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
    sentTo: resolvedRecipientEmail,
    templateUsed: emailTemplate?.slug || "default",
  };
}
