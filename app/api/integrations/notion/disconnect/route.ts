/**
 * Notion Disconnect Endpoint
 * POST /api/integrations/notion/disconnect
 * 
 * Disconnects Notion integration from workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserTier } from "@/lib/tier-limits";

export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Rate Limiting
        const tier = getUserTier(session.user.id, session.user.email);
        const rateLimit = checkRateLimit(request, session.user.id, tier, "general");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: rateLimit.error },
                { status: 429 }
            );
        }

        // 3. Get workspace ID
        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.json(
                { error: "No active workspace" },
                { status: 400 }
            );
        }

        // 4. Update connection status to DISCONNECTED
        const connection = await prisma.integrationConnection.updateMany({
            where: {
                workspaceId,
                provider: "NOTION",
            },
            data: {
                status: "DISCONNECTED",
                accessToken: null,
                refreshToken: null,
                updatedAt: new Date(),
            },
        });

        if (connection.count === 0) {
            return NextResponse.json(
                { error: "No Notion connection found" },
                { status: 404 }
            );
        }

        // 5. Success
        return NextResponse.json({
            success: true,
            message: "Notion disconnected successfully",
        });

    } catch (error) {
        console.error("[Notion Disconnect Error]", error);
        return NextResponse.json(
            { error: "Failed to disconnect Notion" },
            { status: 500 }
        );
    }
}
