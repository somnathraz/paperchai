/**
 * Draft Invoice Approval Reminder API
 * 
 * POST /api/invoices/draft-reminders
 * 
 * This endpoint:
 * 1. Finds all draft invoices with due dates approaching (within X days)
 * 2. Sends reminder emails to workspace owners to review and approve
 * 3. Can be called by a cron job or manually
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { sendEmail } from "@/lib/email";

// Days before due date to send reminders
const REMINDER_DAYS_BEFORE = [7, 3, 1];

// Email template for draft approval reminders
function getDraftApprovalEmail(params: {
    userName: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    currency: string;
    dueDate: string;
    approvalUrl: string;
    daysUntilDue: number;
}) {
    const urgencyColor = params.daysUntilDue <= 1
        ? '#ef4444' // red
        : params.daysUntilDue <= 3
            ? '#f59e0b' // amber
            : '#3b82f6'; // blue

    const urgencyText = params.daysUntilDue <= 1
        ? '⚠️ Due Tomorrow!'
        : params.daysUntilDue <= 3
            ? '📅 Due in 3 days'
            : `📅 Due in ${params.daysUntilDue} days`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Draft Invoice Approval Needed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <table role="presentation" style="width: 100%; margin: 0; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                                📝 Draft Invoice Awaiting Approval
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Urgency Banner -->
                    <tr>
                        <td style="background: ${urgencyColor}15; padding: 16px 32px; border-bottom: 1px solid ${urgencyColor}30;">
                            <p style="margin: 0; color: ${urgencyColor}; font-weight: 600; font-size: 14px; text-align: center;">
                                ${urgencyText}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px; color: #334155; font-size: 16px;">
                                Hi ${params.userName},
                            </p>
                            <p style="margin: 0 0 24px; color: #64748b; line-height: 1.6;">
                                You have a draft invoice that needs your approval before we can start the payment reminder automation.
                            </p>
                            
                            <!-- Invoice Card -->
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                <table style="width: 100%;">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice</p>
                                            <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">${params.invoiceNumber}</p>
                                        </td>
                                        <td align="right">
                                            <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
                                            <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">${params.currency} ${params.amount.toLocaleString()}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 16px; border-top: 1px solid #e2e8f0; margin-top: 16px;">
                                            <table style="width: 100%;">
                                                <tr>
                                                    <td>
                                                        <p style="margin: 0; color: #64748b; font-size: 14px;">Client: <strong style="color: #1e293b;">${params.clientName}</strong></p>
                                                    </td>
                                                    <td align="right">
                                                        <p style="margin: 0; color: #64748b; font-size: 14px;">Due: <strong style="color: ${urgencyColor};">${params.dueDate}</strong></p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <a href="${params.approvalUrl}" style="display: block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px;">
                                Review & Approve Invoice →
                            </a>
                            
                            <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
                                Once approved, we'll automatically send payment reminders to your client.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                This reminder was sent by PaperChai Invoice Automation
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const daysBeforeDue = body.daysBeforeDue || REMINDER_DAYS_BEFORE;
        const forceAll = body.forceAll === true; // For testing, send all drafts

        console.log("[Draft Reminders] Starting scan...");
        console.log("[Draft Reminders] Days before due to check:", daysBeforeDue);

        // Find draft invoices with approaching due dates
        const now = new Date();
        const targetDates = daysBeforeDue.map((days: number) => {
            const date = new Date(now);
            date.setDate(date.getDate() + days);
            date.setHours(0, 0, 0, 0);
            return date;
        });

        // Get draft invoices
        const draftInvoices = await prisma.invoice.findMany({
            where: {
                workspaceId: workspace.id,
                status: "draft",
                ...(forceAll ? {} : {
                    dueDate: {
                        gte: now,
                        lte: new Date(now.getTime() + Math.max(...daysBeforeDue) * 24 * 60 * 60 * 1000)
                    }
                })
            },
            include: {
                client: { select: { name: true, email: true } },
                workspace: {
                    select: {
                        owner: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { dueDate: "asc" }
        });

        console.log(`[Draft Reminders] Found ${draftInvoices.length} draft invoices`);

        const results = {
            checked: draftInvoices.length,
            sent: 0,
            skipped: 0,
            errors: 0,
            details: [] as any[]
        };

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

        for (const invoice of draftInvoices) {
            try {
                const ownerEmail = invoice.workspace?.owner?.email;
                const ownerName = invoice.workspace?.owner?.name || "there";

                if (!ownerEmail) {
                    console.log(`[Draft Reminders] Skipping ${invoice.number} - no owner email`);
                    results.skipped++;
                    continue;
                }

                const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date();
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

                // Check if this is a target reminder day (unless forceAll)
                if (!forceAll && !daysBeforeDue.includes(daysUntilDue)) {
                    console.log(`[Draft Reminders] Skipping ${invoice.number} - ${daysUntilDue} days until due (not a reminder day)`);
                    results.skipped++;
                    continue;
                }

                const approvalUrl = `${baseUrl}/invoices/new?id=${invoice.id}`;
                const total = typeof invoice.total === 'object'
                    ? Number(invoice.total)
                    : invoice.total;

                const emailHtml = getDraftApprovalEmail({
                    userName: ownerName.split(" ")[0],
                    invoiceNumber: invoice.number,
                    clientName: invoice.client?.name || "Unknown Client",
                    amount: Number(total) || 0,
                    currency: invoice.currency || "INR",
                    dueDate: dueDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }),
                    approvalUrl,
                    daysUntilDue
                });

                console.log(`[Draft Reminders] Sending reminder for ${invoice.number} to ${ownerEmail}`);

                await sendEmail({
                    to: ownerEmail,
                    subject: `📝 Action Required: Approve Draft Invoice ${invoice.number}`,
                    html: emailHtml
                });

                results.sent++;
                results.details.push({
                    invoiceNumber: invoice.number,
                    clientName: invoice.client?.name,
                    daysUntilDue,
                    sentTo: ownerEmail
                });

                console.log(`[Draft Reminders] ✅ Sent reminder for ${invoice.number}`);

            } catch (error) {
                console.error(`[Draft Reminders] ❌ Error processing ${invoice.number}:`, error);
                results.errors++;
            }
        }

        console.log(`[Draft Reminders] Complete. Sent: ${results.sent}, Skipped: ${results.skipped}, Errors: ${results.errors}`);

        return NextResponse.json({
            success: true,
            ...results
        });

    } catch (error) {
        console.error("[Draft Reminders] Fatal error:", error);
        return NextResponse.json({ error: "Failed to process draft reminders" }, { status: 500 });
    }
}

// GET endpoint to check draft invoices needing approval
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    try {
        const now = new Date();
        const maxDays = Math.max(...REMINDER_DAYS_BEFORE);

        const draftInvoices = await prisma.invoice.findMany({
            where: {
                workspaceId: workspace.id,
                status: "draft",
                dueDate: {
                    gte: now,
                    lte: new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)
                }
            },
            include: {
                client: { select: { name: true } }
            },
            orderBy: { dueDate: "asc" }
        });

        return NextResponse.json({
            count: draftInvoices.length,
            invoices: draftInvoices.map(inv => ({
                id: inv.id,
                number: inv.number,
                clientName: inv.client?.name,
                total: inv.total,
                currency: inv.currency,
                dueDate: inv.dueDate,
                daysUntilDue: inv.dueDate
                    ? Math.ceil((new Date(inv.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                    : null
            }))
        });
    } catch (error) {
        console.error("[Draft Reminders] Error fetching drafts:", error);
        return NextResponse.json({ error: "Failed to fetch draft invoices" }, { status: 500 });
    }
}
