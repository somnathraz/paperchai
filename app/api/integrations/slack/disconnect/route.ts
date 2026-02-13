/**
 * Slack Disconnect Endpoint
 * POST /api/integrations/slack/disconnect
 *
 * Disconnects Slack integration from workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserTier } from "@/lib/tier-limits";
import { resolveIntegrationWorkspace, requireIntegrationManager } from "@/lib/integrations/access";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate Limiting
    const tier = getUserTier(session.user.id, session.user.email);
    const rateLimit = checkRateLimit(request, session.user.id, tier, "general");

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.error }, { status: 429 });
    }

    // 3. Resolve workspace and require manager role.
    const workspace = await resolveIntegrationWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    const canManage = await requireIntegrationManager(session.user.id, workspace.id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const workspaceId = workspace.id;

    // 4. Update connection status to DISCONNECTED
    const connection = await prisma.integrationConnection.updateMany({
      where: {
        workspaceId,
        provider: "SLACK",
      },
      data: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      },
    });

    if (connection.count === 0) {
      return NextResponse.json({ error: "No Slack connection found" }, { status: 404 });
    }

    // 5. Success
    return NextResponse.json({
      success: true,
      message: "Slack disconnected successfully",
    });
  } catch (error) {
    console.error("[Slack Disconnect Error]", error);
    return NextResponse.json({ error: "Failed to disconnect Slack" }, { status: 500 });
  }
}
