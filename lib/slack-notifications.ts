/**
 * Slack Notification Service
 * 
 * Sends notifications to Slack when invoice status changes
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { postMessage } from "@/lib/slack-client";

/**
 * Send Slack notification when invoice is paid
 */
export async function notifyInvoicePaid(invoiceId: string): Promise<boolean> {
    try {
        // Get invoice with client and workspace
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: { name: true } },
                workspace: { select: { id: true, name: true } },
            },
        });

        if (!invoice || invoice.source !== "slack") {
            return false; // Only notify for Slack-imported invoices
        }

        // Get Slack connection
        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: invoice.workspaceId,
                    provider: "SLACK",
                },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return false;
        }

        // Get the original import to find the channel
        const slackImport = invoice.sourceImportId
            ? await prisma.slackImport.findUnique({
                where: { id: invoice.sourceImportId },
                select: { channelId: true },
            })
            : null;

        if (!slackImport?.channelId) {
            return false;
        }

        // Decrypt token and send message
        const accessToken = decrypt(connection.accessToken);

        const result = await postMessage(
            accessToken,
            slackImport.channelId,
            `:white_check_mark: *Invoice Paid!*\n\n*${invoice.number}* for ${invoice.client.name} has been marked as paid.\n\nAmount: *${invoice.currency} ${Number(invoice.total).toLocaleString()}*`,
            [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `:white_check_mark: *Invoice Paid!*\n\n*${invoice.number}* for ${invoice.client.name}`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*Amount:*\n${invoice.currency} ${Number(invoice.total).toLocaleString()}` },
                        { type: "mrkdwn", text: `*Status:*\nPaid` },
                    ],
                },
                {
                    type: "context",
                    elements: [
                        { type: "mrkdwn", text: `Invoice ${invoice.number} | ${invoice.workspace.name}` },
                    ],
                },
            ]
        );

        return result.ok;
    } catch (error) {
        console.error("[Slack Notification] Error sending paid notification:", error);
        return false;
    }
}

/**
 * Send Slack notification when invoice is overdue
 */
export async function notifyInvoiceOverdue(invoiceId: string): Promise<boolean> {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: { name: true } },
                workspace: { select: { id: true, name: true } },
            },
        });

        if (!invoice || invoice.source !== "slack") {
            return false;
        }

        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: invoice.workspaceId,
                    provider: "SLACK",
                },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return false;
        }

        const slackImport = invoice.sourceImportId
            ? await prisma.slackImport.findUnique({
                where: { id: invoice.sourceImportId },
                select: { channelId: true },
            })
            : null;

        if (!slackImport?.channelId) {
            return false;
        }

        const accessToken = decrypt(connection.accessToken);

        const daysOverdue = invoice.dueDate
            ? Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const result = await postMessage(
            accessToken,
            slackImport.channelId,
            `:warning: *Invoice Overdue*\n\n*${invoice.number}* for ${invoice.client.name} is ${daysOverdue} days overdue.\n\nAmount: *${invoice.currency} ${Number(invoice.total).toLocaleString()}*`,
            [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `:warning: *Invoice Overdue*\n\n*${invoice.number}* for ${invoice.client.name}`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*Amount:*\n${invoice.currency} ${Number(invoice.total).toLocaleString()}` },
                        { type: "mrkdwn", text: `*Days Overdue:*\n${daysOverdue}` },
                    ],
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: { type: "plain_text", text: "View Invoice" },
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}`,
                            action_id: "view_invoice",
                        },
                    ],
                },
            ]
        );

        return result.ok;
    } catch (error) {
        console.error("[Slack Notification] Error sending overdue notification:", error);
        return false;
    }
}

/**
 * Send Slack notification when invoice is sent
 */
export async function notifyInvoiceSent(invoiceId: string): Promise<boolean> {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { select: { name: true } },
                workspace: { select: { id: true, name: true } },
            },
        });

        if (!invoice || invoice.source !== "slack") {
            return false;
        }

        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId: invoice.workspaceId,
                    provider: "SLACK",
                },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return false;
        }

        const slackImport = invoice.sourceImportId
            ? await prisma.slackImport.findUnique({
                where: { id: invoice.sourceImportId },
                select: { channelId: true },
            })
            : null;

        if (!slackImport?.channelId) {
            return false;
        }

        const accessToken = decrypt(connection.accessToken);

        const result = await postMessage(
            accessToken,
            slackImport.channelId,
            `:email: *Invoice Sent!*\n\n*${invoice.number}* has been sent to ${invoice.client.name}.\n\nAmount: *${invoice.currency} ${Number(invoice.total).toLocaleString()}*`,
            [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `:email: *Invoice Sent!*\n\n*${invoice.number}* → ${invoice.client.name}`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*Amount:*\n${invoice.currency} ${Number(invoice.total).toLocaleString()}` },
                        { type: "mrkdwn", text: `*Due:*\n${invoice.dueDate?.toLocaleDateString() || "Not set"}` },
                    ],
                },
            ]
        );

        return result.ok;
    } catch (error) {
        console.error("[Slack Notification] Error sending sent notification:", error);
        return false;
    }
}
