/**
 * Import History API
 * GET /api/integrations/imports
 * 
 * Returns paginated list of Slack and Notion imports
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get workspace ID
        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }

        // 3. Parse query params
        const searchParams = request.nextUrl.searchParams;
        const provider = searchParams.get("provider"); // slack, notion, or all
        const status = searchParams.get("status"); // PENDING, PROCESSING, COMPLETED, FAILED
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
        const cursor = searchParams.get("cursor");

        // 4. Fetch Slack imports
        let slackImports: any[] = [];
        if (!provider || provider === "slack" || provider === "all") {
            slackImports = await prisma.slackImport.findMany({
                where: {
                    connection: { workspaceId },
                    ...(status ? { status: status as any } : {}),
                    ...(cursor ? { id: { lt: cursor } } : {}),
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                select: {
                    id: true,
                    channelId: true,
                    channelName: true,
                    threadTs: true,
                    importType: true,
                    status: true,
                    aiSummary: true,
                    confidenceScore: true,
                    invoiceId: true,
                    projectId: true,
                    clientId: true,
                    errorMessage: true,
                    createdAt: true,
                },
            });
        }

        // 5. Fetch Notion imports
        let notionImports: any[] = [];
        if (!provider || provider === "notion" || provider === "all") {
            notionImports = await prisma.notionImport.findMany({
                where: {
                    connection: { workspaceId },
                    ...(status ? { status: status as any } : {}),
                    ...(cursor ? { id: { lt: cursor } } : {}),
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                select: {
                    id: true,
                    notionDatabaseId: true,
                    notionPageId: true,
                    notionPageTitle: true,
                    importType: true,
                    status: true,
                    aiSummary: true,
                    projectId: true,
                    clientId: true,
                    errorMessage: true,
                    createdAt: true,
                },
            });
        }

        // 6. Combine and sort by date
        const combined = [
            ...slackImports.map((i) => ({ ...i, provider: "slack" as const })),
            ...notionImports.map((i) => ({ ...i, provider: "notion" as const })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // 7. Get stats
        const [slackTotal, slackCompleted, notionTotal, notionCompleted] = await Promise.all([
            prisma.slackImport.count({ where: { connection: { workspaceId } } }),
            prisma.slackImport.count({ where: { connection: { workspaceId }, status: "COMPLETED" } }),
            prisma.notionImport.count({ where: { connection: { workspaceId } } }),
            prisma.notionImport.count({ where: { connection: { workspaceId }, status: "COMPLETED" } }),
        ]);

        return NextResponse.json({
            success: true,
            imports: combined.slice(0, limit),
            stats: {
                slack: { total: slackTotal, completed: slackCompleted },
                notion: { total: notionTotal, completed: notionCompleted },
            },
            hasMore: combined.length > limit,
            nextCursor: combined.length > limit ? combined[limit - 1]?.id : null,
        });

    } catch (error) {
        console.error("[Import History Error]", error);
        return NextResponse.json(
            { error: "Failed to fetch import history" },
            { status: 500 }
        );
    }
}
