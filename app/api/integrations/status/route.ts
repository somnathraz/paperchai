/**
 * Integration Status Endpoint
 * GET /api/integrations/status
 * 
 * Returns status of all integrations for current workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Get workspace ID
        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.json(
                { error: "No active workspace" },
                { status: 400 }
            );
        }

        // 3. Get tier info
        const tier = getUserTier(session.user.id, session.user.email);
        const tierLimits = TIER_LIMITS[tier];

        // 4. Get all connections for this workspace
        const connections = await prisma.integrationConnection.findMany({
            where: { workspaceId },
            select: {
                id: true,
                provider: true,
                status: true,
                providerWorkspaceName: true,
                lastError: true,
                lastErrorAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // 5. Get import counts for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [slackImportCount, notionImportCount] = await Promise.all([
            prisma.slackImport.count({
                where: {
                    connection: { workspaceId },
                    createdAt: { gte: today },
                },
            }),
            prisma.notionImport.count({
                where: {
                    connection: { workspaceId },
                    createdAt: { gte: today },
                },
            }),
        ]);

        // 6. Build response
        const slack = connections.find((c) => c.provider === "SLACK");
        const notion = connections.find((c) => c.provider === "NOTION");

        return NextResponse.json({
            success: true,
            tier,
            integrationsEnabled: tierLimits.integrations.enabled,
            limits: {
                maxConnections: tierLimits.integrations.maxConnections,
                importsPerDay: tierLimits.integrations.importsPerDay,
                importsPerMinute: tierLimits.integrations.importsPerMinute,
            },
            usage: {
                connectionsUsed: connections.filter((c) => c.status === "CONNECTED").length,
                importsToday: slackImportCount + notionImportCount,
            },
            integrations: {
                slack: slack
                    ? {
                        connected: slack.status === "CONNECTED",
                        status: slack.status,
                        workspaceName: slack.providerWorkspaceName,
                        lastError: slack.lastError,
                        lastErrorAt: slack.lastErrorAt,
                        connectedAt: slack.createdAt,
                    }
                    : {
                        connected: false,
                        status: "NOT_CONNECTED",
                    },
                notion: notion
                    ? {
                        connected: notion.status === "CONNECTED",
                        status: notion.status,
                        workspaceName: notion.providerWorkspaceName,
                        lastError: notion.lastError,
                        lastErrorAt: notion.lastErrorAt,
                        connectedAt: notion.createdAt,
                    }
                    : {
                        connected: false,
                        status: "NOT_CONNECTED",
                    },
            },
        });

    } catch (error) {
        console.error("[Integration Status Error]", error);
        return NextResponse.json(
            { error: "Failed to get integration status" },
            { status: 500 }
        );
    }
}
