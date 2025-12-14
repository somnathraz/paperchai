"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { sendEmail } from "@/lib/email";
import { getThemeHtml } from "@/lib/email-themes";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const body = await req.json();
  const { invoiceId, channel = "email", templateSlug, notes, automationEnabled, reminderSettings } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  try {
    // Fetch invoice with client and workspace details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, workspaceId: workspace.id },
      include: {
        client: true,
        workspace: {
          include: { owner: true }
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.client?.email) {
      return NextResponse.json({ error: "Client email not found. Please add client email before sending." }, { status: 400 });
    }

    // Try to get user's "invoice-send" email template or use default
    let emailTemplate = await prisma.emailTemplate.findFirst({
      where: {
        workspaceId: workspace.id,
        slug: "invoice-send"
      }
    });

    // If no custom template, try workspace's default "initial" or "reminder-initial" template
    if (!emailTemplate) {
      emailTemplate = await prisma.emailTemplate.findFirst({
        where: {
          workspaceId: workspace.id,
          slug: { in: ["reminder-initial", "initial"] }
        }
      });
    }

    // Template variables
    const formattedAmount = `${invoice.currency} ${Number(invoice.total).toLocaleString()}`;
    const formattedDueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Upon receipt';

    const templateVars: TemplateVars = {
      clientName: invoice.client.name || "Valued Customer",
      invoiceId: invoice.number || invoice.id,
      amount: formattedAmount,
      dueDate: formattedDueDate,
      companyName: workspace.name || "Your Company",
      paymentLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pay/${invoice.id}`,
    };

    let emailSubject: string;
    let emailBody: string;
    let brandColor = '#0f172a';
    let theme: 'minimal' | 'classic' | 'modern' | 'noir' = 'modern';
    let logoUrl: string | undefined;

    if (emailTemplate) {
      // Use user's template
      emailSubject = replaceTemplateVariables(emailTemplate.subject, templateVars);
      emailBody = replaceTemplateVariables(emailTemplate.body, templateVars);
      brandColor = emailTemplate.brandColor || '#0f172a';
      theme = (emailTemplate.theme as typeof theme) || 'modern';
      logoUrl = emailTemplate.logoUrl || undefined;
    } else {
      // Use default template
      emailSubject = `Invoice ${invoice.number} from ${workspace.name}`;
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

    // Generate themed HTML email
    const themedHtml = getThemeHtml(theme, {
      subject: emailSubject,
      body: emailBody,
      brandColor,
      logoUrl,
      ...templateVars,
    });

    // Send the email
    console.log(`Sending invoice ${invoice.number} to: ${invoice.client.email}`);
    const emailSent = await sendEmail({
      to: invoice.client.email,
      subject: emailSubject,
      html: themedHtml,
      from: workspace.registeredEmail || undefined,
    });

    if (!emailSent) {
      console.error("Email sending failed for invoice:", invoiceId);
      return NextResponse.json({ error: "Failed to send email. Please check your email configuration." }, { status: 500 });
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId, workspaceId: workspace.id },
      data: {
        status: "sent",
        lastSentAt: new Date(),
        deliveryChannel: channel,
        sendMeta: { templateSlug: emailTemplate?.slug || "default", notes },
      },
    });

    // Create reminder history record
    await prisma.reminderHistory.create({
      data: {
        workspaceId: workspace.id,
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        channel,
        kind: "send",
        status: "sent",
        sentAt: new Date(),
        previewToUser: true,
        tone: "Warm",
      },
    });


    // If automation is enabled, mark it in the invoice or log for now
    // The actual reminder scheduling is handled by the existing reminder system
    if (automationEnabled && reminderSettings) {
      console.log("Reminder automation requested for invoice:", invoiceId, reminderSettings);
      // Future work: The /api/invoices/[id]/reminders POST endpoint handles
      // setting up reminder steps. For now, we'll let the user set up reminders
      // through that endpoint after sending.
    }


    console.log(`Invoice ${invoice.number} sent successfully to ${invoice.client.email}`);

    return NextResponse.json({
      ok: true,
      invoice: updatedInvoice,
      emailSent: true,
      sentTo: invoice.client.email,
      templateUsed: emailTemplate?.slug || "default",
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json({
      error: "Failed to send invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
