"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getThemeHtml } from "@/lib/email-themes";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";

// POST /api/internal/scheduled-invoices/run
// This endpoint processes scheduled invoices and sends them
// Should be called by a cron job (e.g., every minute or every 5 minutes)
export async function POST(req: NextRequest) {
    try {
        console.log("Worker started: Processing scheduled invoices...");

        const now = new Date();

        // Find invoices that are scheduled and due to be sent
        const scheduledInvoices = await prisma.invoice.findMany({
            where: {
                status: "scheduled",
                scheduledSendAt: { lte: now },
            },
            include: {
                client: true,
                workspace: {
                    include: { owner: true }
                },
            },
            take: 20 // Process in batches
        });

        console.log(`Found ${scheduledInvoices.length} scheduled invoices to process.`);

        const results = [];

        for (const invoice of scheduledInvoices) {
            const client = invoice.client;
            const workspace = invoice.workspace;

            // Skip if no client email
            if (!client?.email) {
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: "draft",
                        sendMeta: {
                            ...(invoice.sendMeta as object || {}),
                            error: "Client has no email"
                        }
                    }
                });
                results.push({ id: invoice.id, status: "FAILED", reason: "No client email" });
                continue;
            }

            // Try to get user's email template
            let emailTemplate = await prisma.emailTemplate.findFirst({
                where: {
                    workspaceId: workspace.id,
                    slug: "invoice-send"
                }
            });

            // Fallback to reminder-initial template
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
                clientName: client.name || "Valued Customer",
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
                emailSubject = replaceTemplateVariables(emailTemplate.subject, templateVars);
                emailBody = replaceTemplateVariables(emailTemplate.body, templateVars);
                brandColor = emailTemplate.brandColor || '#0f172a';
                theme = (emailTemplate.theme as typeof theme) || 'modern';
                logoUrl = emailTemplate.logoUrl || undefined;
            } else {
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

            // Generate themed HTML
            const themedHtml = getThemeHtml(theme, {
                subject: emailSubject,
                body: emailBody,
                brandColor,
                logoUrl,
                ...templateVars,
            });

            try {
                console.log(`Sending scheduled invoice ${invoice.number} to: ${client.email}`);

                const emailSent = await sendEmail({
                    to: client.email,
                    subject: emailSubject,
                    html: themedHtml,
                    from: workspace.registeredEmail || undefined,
                });

                if (!emailSent) {
                    throw new Error("Email sending returned false");
                }

                // Update invoice status to sent
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: "sent",
                        lastSentAt: new Date(),
                        sendMeta: {
                            ...(invoice.sendMeta as object || {}),
                            templateUsed: emailTemplate?.slug || "default",
                            sentViaScheduler: true
                        }
                    }
                });

                // Create reminder history
                await prisma.reminderHistory.create({
                    data: {
                        workspaceId: workspace.id,
                        clientId: client.id,
                        invoiceId: invoice.id,
                        projectId: invoice.projectId,
                        channel: (invoice.deliveryChannel || "email") as "email" | "whatsapp",
                        kind: "send",
                        status: "sent",
                        sentAt: new Date(),
                    }
                });

                results.push({ id: invoice.id, number: invoice.number, status: "SENT", sentTo: client.email });
                console.log(`Invoice ${invoice.number} sent successfully to ${client.email}`);

            } catch (err: any) {
                console.error(`Failed to send scheduled invoice ${invoice.id}:`, err);

                // Update invoice with error but keep it scheduled for retry? 
                // Or mark as failed draft? Let's mark as draft with error
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: "draft",
                        sendMeta: {
                            ...(invoice.sendMeta as object || {}),
                            error: err.message,
                            failedAt: new Date().toISOString()
                        }
                    }
                });

                results.push({ id: invoice.id, status: "FAILED", error: err.message });
            }
        }

        return NextResponse.json({
            processed: results.length,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Scheduled invoice worker error:", error);
        return NextResponse.json({ error: "Worker failed" }, { status: 500 });
    }
}
