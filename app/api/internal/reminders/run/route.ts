import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";
import { getThemeHtml } from "@/lib/email-themes"; // Reusing existing theme generator if possible or just raw body

// POST /api/internal/reminders/run
export async function POST(req: NextRequest) {
    try {
        // Auth check: In production, check for a secret header or similar.
        // For MVP, we'll allow it but log it.
        console.log("Worker started: Processing reminders...");

        const now = new Date();

        // Find pending steps that are due
        const pendingSteps = await prisma.invoiceReminderStep.findMany({
            where: {
                status: "PENDING",
                sendAt: { lte: now },
                schedule: {
                    enabled: true, // Schedule must be enabled
                    invoice: {
                        remindersEnabled: true, // Invoice must have reminders enabled
                        status: { not: "paid" } // Don't remind for paid invoices based on logic
                        // Note: Depending on requirements, maybe we remind regardless? 
                        // Usually sending reminders for PAID invoices is bad.
                        // Let's filter out PAID invoices.
                    }
                }
            },
            include: {
                schedule: {
                    include: {
                        invoice: {
                            include: {
                                client: true,
                                workspace: {
                                    include: { owner: true } // to get owner email for notification
                                }
                            }
                        }
                    }
                },
                emailTemplate: true
            },
            take: 50 // process in batches
        });

        console.log(`Found ${pendingSteps.length} pending reminders.`);

        const results = [];

        for (const step of pendingSteps) {
            const invoice = step.schedule.invoice;
            const client = invoice.client;
            const workspace = invoice.workspace;
            const template = step.emailTemplate;

            // Skipping logic if invoice is paid
            if (invoice.status === "paid" || invoice.status === "cancelled") {
                await prisma.invoiceReminderStep.update({
                    where: { id: step.id },
                    data: { status: "SKIPPED", updatedAt: new Date() }
                });
                results.push({ id: step.id, status: "SKIPPED", reason: `Invoice status is ${invoice.status}` });
                continue;
            }

            if (!client.email) {
                await prisma.invoiceReminderStep.update({
                    where: { id: step.id },
                    data: { status: "FAILED", lastError: "Client has no email", updatedAt: new Date() }
                });
                results.push({ id: step.id, status: "FAILED", reason: "No client email" });
                continue;
            }

            if (!template) {
                await prisma.invoiceReminderStep.update({
                    where: { id: step.id },
                    data: { status: "FAILED", lastError: "Template not found", updatedAt: new Date() }
                });
                results.push({ id: step.id, status: "FAILED", reason: "Template missing" });
                continue;
            }

            // Prepare variables
            // Format currency and date nicely
            const formattedAmount = `${invoice.currency} ${invoice.total}`; // Simplistic formatting
            const formattedDueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A";

            const vars: TemplateVars = {
                clientName: client.name,
                invoiceId: invoice.number,
                amount: formattedAmount,
                dueDate: formattedDueDate,
                companyName: workspace.name,
                paymentLink: `https://paperchai.com/pay/${invoice.id}` // Mock link
            };

            const subject = replaceTemplateVariables(template.subject, vars);

            // Generate themed HTML using the template's theme and branding
            const themedHtml = getThemeHtml((template.theme as 'minimal' | 'classic' | 'modern' | 'noir') || 'modern', {
                subject,
                body: replaceTemplateVariables(template.body, vars),
                brandColor: template.brandColor || '#0f172a',
                logoUrl: template.logoUrl || undefined,
                ...vars
            });

            // Determine BCC
            const bcc = step.notifyCreator ? workspace.owner.email : undefined;

            try {
                await sendEmail({
                    to: client.email,
                    bcc,
                    subject,
                    html: themedHtml,
                    from: workspace.registeredEmail || `noreply@paperchai.com`
                });

                await prisma.invoiceReminderStep.update({
                    where: { id: step.id },
                    data: { status: "SENT", updatedAt: new Date() }
                });
                results.push({ id: step.id, status: "SENT" });

                // Also log to ReminderHistory? The schema has it.
                // model ReminderHistory { ... }
                // Let's add an entry there too for the "History" tab
                await prisma.reminderHistory.create({
                    data: {
                        workspaceId: workspace.id,
                        clientId: client.id,
                        invoiceId: invoice.id,
                        channel: "email",
                        kind: "reminder",
                        status: "sent",
                        sentAt: new Date()
                    }
                });

            } catch (err: any) {
                console.error(`Failed to send reminder step ${step.id}`, err);
                await prisma.invoiceReminderStep.update({
                    where: { id: step.id },
                    data: { status: "FAILED", lastError: err.message, updatedAt: new Date() }
                });
                results.push({ id: step.id, status: "FAILED", error: err.message });
            }
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error) {
        console.error("Worker error:", error);
        return NextResponse.json({ error: "Worker failed" }, { status: 500 });
    }
}
