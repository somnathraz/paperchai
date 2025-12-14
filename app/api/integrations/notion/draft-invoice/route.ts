/**
 * Notion Draft Invoice Endpoint
 * POST /api/integrations/notion/draft-invoice
 * 
 * Create a draft invoice from a Notion page (basic parsing, no AI)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getPage, getPageBlocks, extractPageProperties, extractTextFromBlocks } from "@/lib/notion-client";
import { requirePremium, checkDailyImportLimit } from "@/lib/middleware/premium-check";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserTier } from "@/lib/tier-limits";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const premiumError = await requirePremium(request);
        if (premiumError) return premiumError;

        const tier = getUserTier(session.user.id, session.user.email);
        const rateLimit = checkRateLimit(request, session.user.id, tier, "integrations");
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: rateLimit.error }, { status: 429 });
        }

        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }

        const importLimit = await checkDailyImportLimit(workspaceId, tier);
        if (!importLimit.allowed) {
            return NextResponse.json({ error: importLimit.error }, { status: 429 });
        }

        const body = await request.json();
        const { pageId, clientId } = body;

        if (!pageId) {
            return NextResponse.json({ error: "Page ID required" }, { status: 400 });
        }

        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: { workspaceId, provider: "NOTION" },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
        }

        const accessToken = decrypt(connection.accessToken);

        // Fetch page properties
        const page = await getPage(accessToken, pageId);
        if (page.error) {
            return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
        }

        const props = extractPageProperties(page);

        // Fetch page blocks
        const blocksResponse = await getPageBlocks(accessToken, pageId);
        const blocks = blocksResponse.results || [];

        // Extract line items from bullet/numbered lists (basic parsing)
        const lineItems: Array<{ title: string; quantity: number; unitPrice: number }> = [];

        for (const block of blocks) {
            const type = block.type;

            if (type === "bulleted_list_item" || type === "numbered_list_item") {
                const richText = block[type]?.rich_text || [];
                const text = richText.map((rt: any) => rt.plain_text).join("");

                if (text) {
                    // Try to parse amount from text (e.g., "Design work - $500" or "5 hours @ 100/hr")
                    const priceMatch = text.match(/[\$₹€]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
                    const hoursMatch = text.match(/(\d+)\s*(?:hours?|hrs?)\s*[@×x]\s*[\$₹€]?\s*(\d+)/i);

                    let quantity = 1;
                    let unitPrice = 0;
                    let title = text;

                    if (hoursMatch) {
                        quantity = parseInt(hoursMatch[1]);
                        unitPrice = parseInt(hoursMatch[2]);
                        title = text.replace(hoursMatch[0], "").trim() || "Service";
                    } else if (priceMatch) {
                        unitPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
                        title = text.replace(priceMatch[0], "").replace(/[-–—]/, "").trim() || "Item";
                    } else {
                        title = text;
                        unitPrice = 0; // User will fill in
                    }

                    lineItems.push({
                        title: title.slice(0, 100),
                        quantity,
                        unitPrice,
                    });
                }
            }
        }

        // Find or use provided client
        let finalClientId = clientId;

        if (!finalClientId) {
            // Try to find client from page properties
            const clientName = props["Client"] || props["client"];
            if (clientName) {
                const client = await prisma.client.findFirst({
                    where: {
                        workspaceId,
                        name: { contains: clientName, mode: "insensitive" },
                    },
                });
                finalClientId = client?.id;
            }
        }

        if (!finalClientId) {
            return NextResponse.json({
                success: false,
                error: "No client identified. Please select a client.",
                extractedItems: lineItems,
                pageTitle: props["Name"] || props["Title"] || "Untitled",
            }, { status: 400 });
        }

        // Generate invoice number
        const invoiceCount = await prisma.invoice.count({
            where: { workspaceId },
        });
        const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

        // Create invoice items
        const items = lineItems.length > 0 ? lineItems : [{
            title: "Service",
            quantity: 1,
            unitPrice: 0,
        }];

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        // Create draft invoice
        const invoice = await prisma.invoice.create({
            data: {
                workspaceId,
                clientId: finalClientId,
                number: invoiceNumber,
                status: "draft",
                currency: "INR",
                subtotal,
                taxTotal: 0,
                total: subtotal,
                notes: `Created from Notion page: ${props["Name"] || props["Title"] || "Untitled"}`,
                issueDate: new Date(),
                items: {
                    create: items.map(item => ({
                        title: item.title,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: 0,
                        total: item.quantity * item.unitPrice,
                    })),
                },
            },
        });

        // Create import record
        await prisma.notionImport.create({
            data: {
                connectionId: connection.id,
                notionDatabaseId: "direct-page",
                notionPageId: pageId.replace(/-/g, ""),
                notionPageTitle: props["Name"] || props["Title"] || "Untitled",
                importType: "INVOICE_DATA",
                status: "COMPLETED",
            },
        });

        return NextResponse.json({
            success: true,
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            itemCount: items.length,
            total: subtotal,
            message: `Created draft invoice ${invoiceNumber} with ${items.length} items`,
        });

    } catch (error) {
        console.error("[Notion Draft Invoice Error]", error);
        return NextResponse.json({ error: "Failed to create draft invoice" }, { status: 500 });
    }
}
