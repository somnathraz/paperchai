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

      const isPermissionIssue =
        response.error === "unauthorized" || response.error === "restricted_resource";
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
