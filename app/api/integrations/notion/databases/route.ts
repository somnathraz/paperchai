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
import { ensureActiveWorkspace } from "@/lib/workspace";
import {
  clearIntegrationConnectionError,
  getReconnectMessage,
  isProviderAuthError,
  markIntegrationConnectionError,
} from "@/lib/integrations/connection-health";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ensure workspace exists
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace", databases: [] }, { status: 400 });
    }
    const workspaceId = workspace.id;

    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "integrations");
    } catch (error) {
      return NextResponse.json(serializeEntitlementError(error), {
        status: (error as any)?.statusCode || 403,
      });
    }

    // 3. Get Notion connection
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
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

      if (isProviderAuthError("NOTION", response.error)) {
        await markIntegrationConnectionError({
          connectionId: connection.id,
          provider: "NOTION",
          reason: getReconnectMessage("NOTION"),
        });
        return NextResponse.json(
          {
            error: getReconnectMessage("NOTION"),
            notionError: response.error,
            reconnectRequired: true,
          },
          { status: 403 }
        );
      }

      const isPermissionIssue =
        response.error === "restricted_resource" || response.error === "object_not_found";
      return NextResponse.json(
        {
          error: isPermissionIssue
            ? "Notion permission issue. Reconnect and ensure databases/pages are shared with the integration."
            : "Failed to fetch databases from Notion.",
          notionError: response.error,
        },
        { status: isPermissionIssue ? 403 : 500 }
      );
    }

    if (connection.lastError) {
      await clearIntegrationConnectionError(connection.id);
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
      count: databases.length,
      guidance:
        databases.length === 0
          ? "No shared Notion databases found. In Notion, share the database with your integration, then refresh."
          : null,
      workspaceName: connection.providerWorkspaceName,
    });
  } catch (error) {
    console.error("[Notion Databases Error]", error);
    return NextResponse.json({ error: "Failed to fetch databases" }, { status: 500 });
  }
}
