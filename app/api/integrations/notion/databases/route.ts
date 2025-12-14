/**
 * Notion Databases List Endpoint
 * GET /api/integrations/notion/databases
 * 
 * Returns list of accessible Notion databases for import
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { listDatabases } from "@/lib/notion-client";
import { requirePremium } from "@/lib/middleware/premium-check";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserTier } from "@/lib/tier-limits";

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

        // 2. Premium Check
        const premiumError = await requirePremium(request);
        if (premiumError) return premiumError;

        // 3. Rate Limiting
        const tier = getUserTier(session.user.id, session.user.email);
        const rateLimit = checkRateLimit(request, session.user.id, tier, "integrations");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: rateLimit.error },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": rateLimit.limit.toString(),
                        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                    },
                }
            );
        }

        // 4. Get workspace ID
        const workspaceId = (session.user as any).activeWorkspaceId;
        if (!workspaceId) {
            return NextResponse.json(
                { error: "No active workspace" },
                { status: 400 }
            );
        }

        // 5. Get Notion connection
        const connection = await prisma.integrationConnection.findUnique({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider: "NOTION",
                },
            },
        });

        if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
            return NextResponse.json(
                { error: "Notion not connected", connected: false },
                { status: 400 }
            );
        }

        // 6. Decrypt token
        const accessToken = decrypt(connection.accessToken);

        // 7. Fetch databases from Notion
        const response = await listDatabases(accessToken);

        if (response.error) {
            console.error("[Notion Databases] API Error:", response.error);

            // Update connection status on auth error
            if (response.error === "unauthorized") {
                await prisma.integrationConnection.update({
                    where: { id: connection.id },
                    data: {
                        status: "ERROR",
                        lastError: "Token expired or revoked",
                        lastErrorAt: new Date(),
                    },
                });
            }

            return NextResponse.json(
                { error: "Failed to fetch databases" },
                { status: 500 }
            );
        }

        // 8. Transform response
        const databases = (response.results || []).map((db: any) => ({
            id: db.id.replace(/-/g, ""),
            title: db.title?.[0]?.plain_text || "Untitled",
            properties: Object.keys(db.properties || {}),
            url: db.url,
        }));

        return NextResponse.json({
            success: true,
            databases,
            workspaceName: connection.providerWorkspaceName,
        });

    } catch (error) {
        console.error("[Notion Databases Error]", error);
        return NextResponse.json(
            { error: "Failed to fetch databases" },
            { status: 500 }
        );
    }
}
