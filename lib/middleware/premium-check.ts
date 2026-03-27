import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkspaceEntitlement } from "@/lib/entitlements";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function requirePremium(request: NextRequest): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const entitlement = await getWorkspaceEntitlement(workspace.id, session.user.id);
  if (entitlement.platformBypass) return null;

  if (!entitlement.subscriptionActive) {
    return NextResponse.json(
      {
        error: "Subscription inactive",
        code: "SUBSCRIPTION_INACTIVE",
        upgradeUrl: "/settings/billing",
        currentPlan: entitlement.planCode,
      },
      { status: 403 }
    );
  }

  if (!entitlement.features.integrations) {
    return NextResponse.json(
      {
        error: "Premium feature",
        code: "FEATURE_NOT_AVAILABLE",
        message:
          "Integrations are only available on Premium or Premier. Upgrade to unlock Slack and Notion integrations.",
        upgradeUrl: "/settings/billing",
        currentPlan: entitlement.planCode,
      },
      { status: 403 }
    );
  }

  return null;
}

export async function checkConnectionLimit(
  workspaceId: string,
  planCode: "FREE" | "PREMIUM" | "PREMIER"
): Promise<{ allowed: boolean; error?: string }> {
  const { prisma } = await import("@/lib/prisma");
  const { TIER_LIMITS } = await import("@/lib/tier-limits");

  const connectionCount = await prisma.integrationConnection.count({
    where: {
      workspaceId,
      status: "CONNECTED",
    },
  });

  const limit = TIER_LIMITS[planCode].integrations.maxConnections;
  if (limit !== -1 && connectionCount >= limit) {
    return {
      allowed: false,
      error: `Maximum connections reached (${limit}). Upgrade your plan to connect more providers.`,
    };
  }

  return { allowed: true };
}

export async function checkDailyImportLimit(
  workspaceId: string,
  planCode: "FREE" | "PREMIUM" | "PREMIER"
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const { prisma } = await import("@/lib/prisma");
  const { TIER_LIMITS } = await import("@/lib/tier-limits");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const importCount =
    (await prisma.slackImport.count({
      where: {
        connection: { workspaceId },
        createdAt: { gte: today },
      },
    })) +
    (await prisma.notionImport.count({
      where: {
        connection: { workspaceId },
        createdAt: { gte: today },
      },
    }));

  const limit = TIER_LIMITS[planCode].integrations.importsPerDay;
  if (limit !== -1 && importCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      error: `Daily import limit reached (${limit}).`,
    };
  }

  return {
    allowed: true,
    remaining: limit === -1 ? -1 : Math.max(0, limit - importCount),
  };
}
