import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { queryDatabase, extractPageProperties } from "@/lib/notion-client";
import { ensureActiveWorkspace } from "@/lib/workspace";

function normalizeNotionId(id: string) {
  const compact = (id || "").replace(/-/g, "");
  if (compact.length !== 32) return id;
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ databaseId: string }> }
) {
  try {
    const { databaseId } = await params;

    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ensure workspace exists
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace", pages: [] }, { status: 400 });
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
      return NextResponse.json({ error: "Notion not connected", pages: [] }, { status: 400 });
    }

    // 4. Decrypt token
    const accessToken = decrypt(connection.accessToken);

    // 5. Fetch pages from database
    const notionDatabaseId = normalizeNotionId(databaseId);
    const response = await queryDatabase(accessToken, notionDatabaseId, undefined, 100);

    if (response.error) {
      console.error("[Notion Database Pages] API Error:", response.error);
      const isPermissionIssue =
        response.error === "object_not_found" || response.error === "restricted_resource";
      return NextResponse.json(
        {
          error: isPermissionIssue
            ? "Cannot access this database. Share it with the Notion integration and try again."
            : "Failed to fetch pages from Notion.",
          notionError: response.error,
        },
        { status: isPermissionIssue ? 403 : 500 }
      );
    }

    // 6. Transform response
    const pages = (response.results || []).map((page: any) => {
      const properties = extractPageProperties(page);
      // Find title property (usually the first property or one named "Name"/"Title")
      const titleProp = Object.entries(properties).find(
        ([key, value]) => typeof value === "string" && value.length > 0
      );

      return {
        id: page.id.replace(/-/g, ""),
        title: titleProp ? (titleProp[1] as string) : "Untitled",
        url: page.url,
      };
    });

    return NextResponse.json({
      success: true,
      pages,
      count: pages.length,
      guidance:
        pages.length === 0
          ? "This database has no pages yet, or visible pages are not shared with the integration."
          : null,
    });
  } catch (error) {
    console.error("[Notion Database Pages Error]", error);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}
