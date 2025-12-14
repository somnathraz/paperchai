import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's workspace
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { workspaces: { take: 1 } },
        });

        if (!user || !user.workspaces[0]) {
            return NextResponse.json({ error: "No workspace found" }, { status: 404 });
        }

        const workspaceId = user.workspaces[0].id;

        // Get connections for this workspace
        const connections = await prisma.integrationConnection.findMany({
            where: { workspaceId },
            select: { id: true, provider: true },
        });

        const connectionIds = connections.map((c) => c.id);

        if (connectionIds.length === 0) {
            return NextResponse.json({
                success: true,
                automations: {
                    running: [],
                    completed: [],
                    failed: [],
                    total: 0,
                },
            });
        }

        // Fetch recent Notion imports
        const notionImports = await prisma.notionImport.findMany({
            where: { connectionId: { in: connectionIds } },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        // Fetch recent Slack imports
        const slackImports = await prisma.slackImport.findMany({
            where: { connectionId: { in: connectionIds } },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        // Transform to automation format
        const automations = [
            ...notionImports.map((imp) => ({
                id: imp.id,
                name: `Notion ${imp.importType} Import`,
                status: imp.status === "COMPLETED" ? "completed" : imp.status === "FAILED" ? "failed" : "running",
                trigger: "Notion import",
                action: `Imported ${imp.importType.toLowerCase().replace("_", " ")}`,
                createdAt: imp.createdAt.toISOString(),
                pageTitle: imp.notionPageTitle,
                details: imp.errorMessage || imp.aiSummary || `Processing ${imp.importType.toLowerCase()}`,
            })),
            ...slackImports.map((imp) => ({
                id: imp.id,
                name: `Slack ${imp.importType} Import`,
                status: imp.status === "COMPLETED" ? "completed" : imp.status === "FAILED" ? "failed" : "running",
                trigger: "Slack command",
                action: `Created from ${imp.importType.toLowerCase().replace("_", " ")}`,
                createdAt: imp.createdAt.toISOString(),
                channelName: imp.channelName,
                details: imp.errorMessage || imp.aiSummary || `Processing Slack ${imp.importType.toLowerCase()}`,
            })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Separate by status
        const running = automations.filter((a) => a.status === "running");
        const completed = automations.filter((a) => a.status === "completed").slice(0, 5);
        const failed = automations.filter((a) => a.status === "failed").slice(0, 3);

        return NextResponse.json({
            success: true,
            automations: {
                running,
                completed,
                failed,
                total: automations.length,
            },
        });
    } catch (error) {
        console.error("Error fetching automations:", error);
        return NextResponse.json(
            { error: "Failed to fetch automations" },
            { status: 500 }
        );
    }
}
