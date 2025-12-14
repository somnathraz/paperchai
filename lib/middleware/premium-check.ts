/**
 * Premium Access Middleware
 * 
 * Ensures only PREMIUM and OWNER tier users can access integration features
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";

/**
 * Require PREMIUM or OWNER tier for integrations
 * Returns null if access granted, or error response if blocked
 */
export async function requirePremium(request: NextRequest): Promise<NextResponse | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const tier = getUserTier(session.user.id, session.user.email);

    if (!TIER_LIMITS[tier].integrations.enabled) {
        return NextResponse.json(
            {
                error: "Premium feature",
                message: "Integrations are only available for Premium members. Upgrade to unlock Slack and Notion integrations.",
                upgradeUrl: "/settings/billing",
                currentTier: tier
            },
            { status: 403 }
        );
    }

    return null; // Access granted
}

/**
 * Check if user has reached max connections limit
 */
export async function checkConnectionLimit(
    workspaceId: string,
    tier: "FREE" | "PREMIUM" | "OWNER"
): Promise<{ allowed: boolean; error?: string }> {
    const { prisma } = await import("@/lib/prisma");

    const connectionCount = await prisma.integrationConnection.count({
        where: {
            workspaceId,
            status: "CONNECTED"
        }
    });

    const limit = TIER_LIMITS[tier].integrations.maxConnections;

    if (connectionCount >= limit) {
        return {
            allowed: false,
            error: `Maximum connections reached (${limit}). ${tier === "PREMIUM" ? "Contact support to increase your limit." : "Upgrade to Premium for more connections."
                }`
        };
    }

    return { allowed: true };
}

/**
 * Check if user has reached daily import limit
 */
export async function checkDailyImportLimit(
    workspaceId: string,
    tier: "FREE" | "PREMIUM" | "OWNER"
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
    const { prisma } = await import("@/lib/prisma");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const importCount = await prisma.slackImport.count({
        where: {
            connection: {
                workspaceId
            },
            createdAt: {
                gte: today
            }
        }
    }) + await prisma.notionImport.count({
        where: {
            connection: {
                workspaceId
            },
            createdAt: {
                gte: today
            }
        }
    });

    const limit = TIER_LIMITS[tier].integrations.importsPerDay;

    if (importCount >= limit) {
        return {
            allowed: false,
            remaining: 0,
            error: `Daily import limit reached (${limit}). ${tier === "PREMIUM" ? "Limit resets at midnight." : "Upgrade to Premium for higher limits."
                }`
        };
    }

    return {
        allowed: true,
        remaining: limit - importCount
    };
}
