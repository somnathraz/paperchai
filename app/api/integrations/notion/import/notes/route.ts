/**
 * Notion Import Notes Endpoint
 * POST /api/integrations/notion/import/notes
 * 
 * Import meeting notes from Notion pages
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { queryDatabase, extractPageProperties, getPageBlocks } from "@/lib/notion-client";
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
        const { databaseId, fieldMapping, preview } = body;

        if (!databaseId) {
            return NextResponse.json({ error: "Database ID required" }, { status: 400 });
        }

        const mapping = fieldMapping || {
            title: "Name",
            client: "Client",
            date: "Date",
        };

        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: { workspaceId, provider: "NOTION" },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
        }

        const accessToken = decrypt(connection.accessToken);

        // Preview Mode
        if (preview) {
            const response = await queryDatabase(accessToken, databaseId, undefined, 5);
            if (response.error) {
                return NextResponse.json({ error: "Failed to query Notion database" }, { status: 500 });
            }

            const previewResults = [];
            for (const page of response.results || []) {
                const props = extractPageProperties(page);
                previewResults.push({
                    id: page.id,
                    mapped: {
                        title: props[mapping.title] || null,
                        client: props[mapping.client] || null,
                        date: props[mapping.date] || null
                    },
                    original: props
                });
            }

            return NextResponse.json({
                success: true,
                preview: true,
                data: previewResults,
                fieldMapping: mapping
            });
        }

        // Fetch pages
        const response = await queryDatabase(accessToken, databaseId);
        if (response.error) {
            return NextResponse.json({ error: "Failed to query Notion database" }, { status: 500 });
        }

        const pages = response.results || [];
        if (pages.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No pages found",
                imported: 0,
            });
        }

        // Get clients for matching
        const clients = await prisma.client.findMany({
            where: { workspaceId },
            select: { id: true, name: true },
        });

        let imported = 0;
        const results: Array<{ title: string; status: string }> = [];

        for (const page of pages.slice(0, 50)) {
            try {
                const props = extractPageProperties(page);
                const pageId = page.id.replace(/-/g, "");

                const title = props[mapping.title] || "Untitled Note";

                // Match client
                const clientName = props[mapping.client];
                const clientId = clientName
                    ? clients.find(c => c.name.toLowerCase() === clientName.toLowerCase())?.id
                    : null;

                // Fetch page content
                const blocksResponse = await getPageBlocks(accessToken, page.id);
                const rawBlocks = blocksResponse.results || [];

                // Parse date
                const noteDate = props[mapping.date] ? new Date(props[mapping.date]) : null;

                // Check if already imported
                const existing = await prisma.meetingNote.findUnique({
                    where: { notionPageId: pageId },
                });

                if (existing) {
                    await prisma.meetingNote.update({
                        where: { id: existing.id },
                        data: {
                            title,
                            clientId,
                            date: noteDate,
                            rawBlocks: rawBlocks,
                        },
                    });
                    results.push({ title, status: "updated" });
                } else {
                    await prisma.meetingNote.create({
                        data: {
                            workspaceId,
                            title,
                            notionPageId: pageId,
                            clientId,
                            date: noteDate,
                            rawBlocks: rawBlocks,
                        },
                    });
                    results.push({ title, status: "created" });
                }

                imported++;

                await prisma.notionImport.create({
                    data: {
                        connectionId: connection.id,
                        notionDatabaseId: databaseId,
                        notionPageId: pageId,
                        notionPageTitle: title,
                        importType: "MEETING_NOTE",
                        status: "COMPLETED",
                    },
                });

            } catch (pageError) {
                results.push({ title: "Error", status: "failed" });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${imported} meeting notes`,
            imported,
            total: pages.length,
            results: results.slice(0, 20),
        });

    } catch (error) {
        console.error("[Notion Import Notes Error]", error);
        return NextResponse.json({ error: "Failed to import notes" }, { status: 500 });
    }
}
