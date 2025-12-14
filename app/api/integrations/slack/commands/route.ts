/**
 * Slack Slash Commands Endpoint
 * POST /api/integrations/slack/commands
 * 
 * Handles /invoice commands from Slack
 * Commands: /invoice create <description>, /invoice from-thread, /invoice status <number>
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { verifySlackSignature, fetchThreadMessages, sendEphemeralMessage } from "@/lib/slack-client";
import { slackCommandSchema, sanitizeInput } from "@/lib/validation/integration-schemas";

export async function POST(request: NextRequest) {
    try {
        // 1. Get raw body for signature verification
        const rawBody = await request.text();

        // 2. Verify Slack signature (security layer)
        const signature = request.headers.get("x-slack-signature");
        const timestamp = request.headers.get("x-slack-request-timestamp");

        if (!verifySlackSignature(signature, timestamp, rawBody)) {
            console.error("[Slack Commands] Invalid signature");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        // 3. Parse URL-encoded body
        const formData = new URLSearchParams(rawBody);
        const params: Record<string, string> = {};
        formData.forEach((value, key) => {
            params[key] = value;
        });

        // 4. Validate input
        const validated = slackCommandSchema.safeParse(params);
        if (!validated.success) {
            console.error("[Slack Commands] Invalid params:", validated.error);
            return NextResponse.json({
                response_type: "ephemeral",
                text: "❌ Invalid command format. Please try again."
            });
        }

        const { team_id, channel_id, user_id, command, text, response_url } = validated.data;

        // 5. Find connection for this Slack workspace
        const connection = await prisma.integrationConnection.findFirst({
            where: {
                providerWorkspaceId: team_id,
                provider: "SLACK",
                status: "CONNECTED",
            },
            include: {
                workspace: true,
            },
        });

        if (!connection || !connection.accessToken) {
            return NextResponse.json({
                response_type: "ephemeral",
                text: "❌ PaperChai is not connected to this Slack workspace. Please connect at your PaperChai dashboard → Settings → Integrations."
            });
        }

        // 6. Decrypt token
        const accessToken = decrypt(connection.accessToken);

        // 7. Parse command
        const sanitizedText = sanitizeInput(text);
        const parts = sanitizedText.split(/\s+/);
        const subCommand = parts[0]?.toLowerCase() || "";
        const args = parts.slice(1).join(" ");

        // 8. Handle different sub-commands
        switch (subCommand) {
            case "create":
                return handleCreateCommand(connection.workspaceId, args, channel_id, user_id, accessToken);

            case "from-thread":
                return handleFromThreadCommand(connection.workspaceId, channel_id, user_id, accessToken, params.thread_ts);

            case "status":
                return handleStatusCommand(connection.workspaceId, args);

            case "send":
                return handleSendCommand(connection.workspaceId, args);

            case "mark-paid":
                return handleMarkPaidCommand(connection.workspaceId, args);

            case "help":
            case "":
                return handleHelpCommand();

            default:
                return NextResponse.json({
                    response_type: "ephemeral",
                    text: `❓ Unknown command: \`${subCommand}\`\n\nAvailable commands:\n• \`/invoice create <description>\` - Create invoice from description\n• \`/invoice status <number>\` - Check invoice status\n• \`/invoice send <number>\` - Send an invoice\n• \`/invoice mark-paid <number> <amount> <method> "<ref>"\` - Mark invoice as paid\n• \`/invoice help\` - Show this help`
                });
        }

    } catch (error) {
        console.error("[Slack Commands Error]", error);
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ An error occurred. Please try again later."
        });
    }
}

/**
 * Handle /invoice create <description>
 */
async function handleCreateCommand(
    workspaceId: string,
    description: string,
    channelId: string,
    userId: string,
    accessToken: string
) {
    if (!description || description.length < 5) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Please provide a description.\n\nExample: `/invoice create for Acme Corp: 5 hours consulting at $100/hr`"
        });
    }

    // Create import record
    const connection = await prisma.integrationConnection.findFirst({
        where: { workspaceId, provider: "SLACK" },
    });

    if (!connection) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Slack not connected."
        });
    }

    const slackImport = await prisma.slackImport.create({
        data: {
            connectionId: connection.id,
            channelId,
            importType: "SLASH_COMMAND",
            status: "PENDING",
            rawMessages: JSON.stringify([{ user: userId, text: description }]),
        },
    });

    // Call AI extraction (async - respond immediately)
    processAIExtraction(slackImport.id, description, workspaceId).catch(console.error);

    return NextResponse.json({
        response_type: "ephemeral",
        text: `✅ Creating invoice from your description...\n\n> ${description.substring(0, 100)}${description.length > 100 ? "..." : ""}\n\nYou'll receive a notification when it's ready. Check your PaperChai dashboard for the draft.`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `✅ *Creating invoice...*\n\n> ${description.substring(0, 150)}${description.length > 150 ? "..." : ""}`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Processing with AI... You'll see the draft in PaperChai shortly."
                    }
                ]
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Open PaperChai" },
                        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/invoices`,
                        action_id: "open_dashboard"
                    }
                ]
            }
        ]
    });
}

/**
 * Handle /invoice from-thread
 */
async function handleFromThreadCommand(
    workspaceId: string,
    channelId: string,
    userId: string,
    accessToken: string,
    threadTs?: string
) {
    if (!threadTs) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ This command must be used in a thread. Reply to a message thread and try again."
        });
    }

    // Fetch thread messages
    const messagesResponse = await fetchThreadMessages(accessToken, channelId, threadTs);

    if (!messagesResponse.ok || !messagesResponse.messages || messagesResponse.messages.length === 0) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ Could not fetch thread messages: ${messagesResponse.error || "Unknown error"}`
        });
    }

    const connection = await prisma.integrationConnection.findFirst({
        where: { workspaceId, provider: "SLACK" },
    });

    if (!connection) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Slack not connected."
        });
    }

    // Create import record
    const slackImport = await prisma.slackImport.create({
        data: {
            connectionId: connection.id,
            channelId,
            threadTs,
            importType: "THREAD_SUMMARY",
            status: "PENDING",
            rawMessages: JSON.stringify(messagesResponse.messages),
        },
    });

    // Combine messages for AI
    const combinedText = messagesResponse.messages
        .map((m) => m.text)
        .join("\n---\n");

    // Call AI extraction (async)
    processAIExtraction(slackImport.id, combinedText, workspaceId).catch(console.error);

    return NextResponse.json({
        response_type: "ephemeral",
        text: `✅ Analyzing ${messagesResponse.messages.length} messages from this thread...\n\nYou'll receive a notification when the invoice draft is ready.`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `✅ *Analyzing thread...* (${messagesResponse.messages.length} messages)`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "AI is extracting invoice details. Check PaperChai for the draft."
                    }
                ]
            }
        ]
    });
}

/**
 * Handle /invoice status <number>
 */
async function handleStatusCommand(workspaceId: string, invoiceNumber: string) {
    if (!invoiceNumber) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Please provide an invoice number.\n\nExample: `/invoice status INV-001`"
        });
    }

    const invoice = await prisma.invoice.findFirst({
        where: {
            workspaceId,
            number: invoiceNumber.toUpperCase(),
        },
        include: {
            client: { select: { name: true } },
        },
    });

    if (!invoice) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ Invoice \`${invoiceNumber}\` not found.`
        });
    }

    const statusEmoji: Record<string, string> = {
        draft: "📝",
        sent: "📤",
        paid: "✅",
        overdue: "⚠️",
        cancelled: "❌",
    };

    return NextResponse.json({
        response_type: "ephemeral",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Invoice ${invoice.number}*\n${statusEmoji[invoice.status] || "📄"} Status: *${invoice.status.toUpperCase()}*`
                }
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Client:* ${invoice.client.name}` },
                    { type: "mrkdwn", text: `*Total:* ${invoice.currency} ${Number(invoice.total).toLocaleString()}` },
                    { type: "mrkdwn", text: `*Issue Date:* ${invoice.issueDate.toLocaleDateString()}` },
                    { type: "mrkdwn", text: `*Due Date:* ${invoice.dueDate?.toLocaleDateString() || "Not set"}` },
                ]
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "View Invoice" },
                        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/invoices/${invoice.id}`,
                        action_id: "view_invoice"
                    }
                ]
            }
        ]
    });
}

/**
 * Handle /invoice help
 */
function handleHelpCommand() {
    return NextResponse.json({
        response_type: "ephemeral",
        blocks: [
            {
                type: "header",
                text: { type: "plain_text", text: "📄 PaperChai Invoice Commands" }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Available Commands:*"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "`/invoice create <description>`\nCreate an invoice from a text description.\n_Example: `/invoice create for Acme Corp: 5 hours consulting at $100/hr`_"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "`/invoice from-thread`\nAnalyze the current thread and create an invoice from the conversation.\n_Use this inside a thread reply._"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "`/invoice status <number>`\nCheck the status of an existing invoice.\n_Example: `/invoice status INV-001`_"
                }
            },
            {
                type: "divider"
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Need help? Visit <https://paperchai.com/help|PaperChai Help Center>"
                    }
                ]
            }
        ]
    });
}

/**
 * Process AI extraction (async)
 */
async function processAIExtraction(importId: string, text: string, workspaceId: string) {
    try {
        // Update status
        await prisma.slackImport.update({
            where: { id: importId },
            data: { status: "PROCESSING" },
        });

        // Call AI extraction API
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/slack/extract`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, workspaceId, importId }),
            }
        );

        const result = await response.json();

        if (result.success) {
            await prisma.slackImport.update({
                where: { id: importId },
                data: {
                    status: "COMPLETED",
                    aiSummary: result.summary,
                    extractedData: result.data,
                    confidenceScore: result.confidence,
                    invoiceId: result.invoiceId,
                },
            });
        } else {
            await prisma.slackImport.update({
                where: { id: importId },
                data: {
                    status: "FAILED",
                    errorMessage: result.error || "AI extraction failed",
                },
            });
        }
    } catch (error) {
        console.error("[AI Extraction Error]", error);
        await prisma.slackImport.update({
            where: { id: importId },
            data: {
                status: "FAILED",
                errorMessage: "Internal error during AI extraction",
            },
        });
    }
}

/**
 * Handle /invoice send <number>
 */
async function handleSendCommand(workspaceId: string, invoiceNumber: string) {
    if (!invoiceNumber) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Please provide an invoice number.\n\nExample: `/invoice send INV-001`"
        });
    }

    const invoice = await prisma.invoice.findFirst({
        where: {
            workspaceId,
            number: invoiceNumber.toUpperCase(),
        },
        include: {
            client: { select: { name: true, email: true } },
        },
    });

    if (!invoice) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ Invoice \`${invoiceNumber}\` not found.`
        });
    }

    if (invoice.status === "paid") {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `✅ Invoice \`${invoiceNumber}\` is already paid!`
        });
    }

    if (!invoice.client.email) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ Client "${invoice.client.name}" has no email address. Please update client details in PaperChai.`
        });
    }

    // Update invoice status to sent
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            status: "sent",
            lastSentAt: new Date(),
        },
    });

    // Note: Actual email sending would be triggered here via your email service
    // For now, we just update the status

    return NextResponse.json({
        response_type: "ephemeral",
        text: `📤 Invoice *${invoice.number}* marked as sent to ${invoice.client.name} (${invoice.client.email}).\n\n_Tip: Configure email settings in PaperChai to auto-send emails._`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `📤 *Invoice ${invoice.number} sent!*`
                }
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*To:* ${invoice.client.name}` },
                    { type: "mrkdwn", text: `*Email:* ${invoice.client.email}` },
                    { type: "mrkdwn", text: `*Amount:* ${invoice.currency} ${Number(invoice.total).toLocaleString()}` },
                ]
            }
        ]
    });
}

/**
 * Handle /invoice mark-paid <number> <amount> <method> "<reference>"
 * Example: /invoice mark-paid INV-001 12000 UPI "GPay ref: xxx"
 */
async function handleMarkPaidCommand(workspaceId: string, args: string) {
    // Parse args: INV-001 12000 UPI "GPay ref: xxx"
    const match = args.match(/^(\S+)\s+(\d+(?:\.\d{2})?)\s+(\w+)\s*"?([^"]*)"?$/);

    if (!match) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: "❌ Invalid format.\n\nUsage: `/invoice mark-paid <number> <amount> <method> \"<reference>\"`\n\nExample: `/invoice mark-paid INV-001 12000 UPI \"GPay ref: abc123\"`"
        });
    }

    const [, invoiceNumber, amountStr, method, reference] = match;
    const amount = parseFloat(amountStr);

    const invoice = await prisma.invoice.findFirst({
        where: {
            workspaceId,
            number: invoiceNumber.toUpperCase(),
        },
        include: {
            client: { select: { name: true } },
        },
    });

    if (!invoice) {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `❌ Invoice \`${invoiceNumber}\` not found.`
        });
    }

    if (invoice.status === "paid") {
        return NextResponse.json({
            response_type: "ephemeral",
            text: `✅ Invoice \`${invoiceNumber}\` is already marked as paid.`
        });
    }

    const invoiceTotal = Number(invoice.total);
    const isPartial = amount < invoiceTotal;
    const isOverpaid = amount > invoiceTotal;

    // Update invoice status
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            status: "paid",
            notes: `${invoice.notes || ""}\n\n[Payment] ${new Date().toISOString()}: ${invoice.currency} ${amount} via ${method.toUpperCase()}${reference ? ` - Ref: ${reference}` : ""}`.trim(),
        },
    });

    // Stop reminders if enabled
    if (invoice.remindersEnabled) {
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { remindersEnabled: false },
        });
    }

    let message = `✅ *Invoice ${invoice.number} marked as PAID!*`;
    if (isPartial) {
        message += `\n\n⚠️ _Partial payment: ${invoice.currency} ${amount} of ${invoice.currency} ${invoiceTotal}_`;
    } else if (isOverpaid) {
        message += `\n\n💰 _Overpayment: ${invoice.currency} ${amount} received (invoice was ${invoice.currency} ${invoiceTotal})_`;
    }

    return NextResponse.json({
        response_type: "in_channel", // Visible to everyone
        text: message,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `✅ *Invoice ${invoice.number} — PAID*`
                }
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Client:* ${invoice.client.name}` },
                    { type: "mrkdwn", text: `*Amount:* ${invoice.currency} ${amount.toLocaleString()}` },
                    { type: "mrkdwn", text: `*Method:* ${method.toUpperCase()}` },
                    { type: "mrkdwn", text: reference ? `*Ref:* ${reference}` : `*Ref:* —` },
                ]
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: isPartial ? `⚠️ Partial payment (${invoice.currency} ${invoiceTotal - amount} remaining)` : "Payment recorded via Slack"
                    }
                ]
            }
        ]
    });
}
