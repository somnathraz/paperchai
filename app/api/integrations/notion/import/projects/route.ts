/**
 * Notion Import Projects Endpoint
 * POST /api/integrations/notion/import/projects
 *
 * Import projects from a Notion database
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { queryDatabase, extractPageProperties } from "@/lib/notion-client";
import { requirePremium, checkDailyImportLimit } from "@/lib/middleware/premium-check";
import { checkRateLimit } from "@/lib/rate-limiter";
import { resolveIntegrationWorkspace, requireIntegrationManager } from "@/lib/integrations/access";
import { getWorkspaceEntitlement } from "@/lib/entitlements";
import {
  clearIntegrationConnectionError,
  getReconnectMessage,
  isProviderAuthError,
  markIntegrationConnectionError,
} from "@/lib/integrations/connection-health";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const premiumError = await requirePremium(request);
    if (premiumError) return premiumError;

    const workspace = await resolveIntegrationWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    const workspaceId = workspace.id;
    const entitlement = await getWorkspaceEntitlement(workspaceId, session.user.id);
    const planCode = entitlement.platformBypass ? "PREMIER" : entitlement.planCode;
    const rateLimit = checkRateLimit(request, session.user.id, planCode, "integrations");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.error }, { status: 429 });
    }
    const canManage = await requireIntegrationManager(session.user.id, workspaceId);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const importLimit = await checkDailyImportLimit(workspaceId, planCode);
    if (!importLimit.allowed) {
      return NextResponse.json({ error: importLimit.error }, { status: 429 });
    }

    const body = await request.json();
    const { databaseId, fieldMapping, preview } = body;

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID required" }, { status: 400 });
    }

    const mapping = fieldMapping || {
      name: "Project Name",
      client: "Client",
      rate: "Rate",
      currency: "Currency",
      status: "Status",
      startDate: "Start",
      endDate: "Due",
    };

    const connection = await prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: "NOTION" },
      },
    });

    if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }

    const accessToken = decrypt(connection.accessToken);
    const handleNotionError = async (code?: string) => {
      if (isProviderAuthError("NOTION", code)) {
        await markIntegrationConnectionError({
          connectionId: connection.id,
          provider: "NOTION",
          reason: getReconnectMessage("NOTION"),
        });
        return NextResponse.json(
          { error: getReconnectMessage("NOTION"), reconnectRequired: true },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Failed to query Notion database" }, { status: 500 });
    };

    // Preview Mode
    if (preview) {
      const response = await queryDatabase(accessToken, databaseId, undefined, 5);
      if (response.error) {
        return handleNotionError(response.error);
      }

      if (connection.lastError) {
        await clearIntegrationConnectionError(connection.id);
      }

      const previewResults = [];
      for (const page of response.results || []) {
        const props = extractPageProperties(page);
        previewResults.push({
          id: page.id,
          mapped: {
            name: props[mapping.name] || null,
            client: props[mapping.client] || null,
            rate: props[mapping.rate] || null,
            currency: props[mapping.currency] || null,
            status: props[mapping.status] || null,
            startDate: props[mapping.startDate] || null,
            endDate: props[mapping.endDate] || null,
          },
          original: props,
        });
      }

      return NextResponse.json({
        success: true,
        preview: true,
        data: previewResults,
        fieldMapping: mapping,
      });
    }

    // Fetch pages with pagination
    let allPages: any[] = [];
    let cursor: string | undefined;

    do {
      const response = await queryDatabase(accessToken, databaseId, cursor);
      if (response.error) {
        return handleNotionError(response.error);
      }
      allPages = allPages.concat(response.results || []);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor && allPages.length < 200);

    if (connection.lastError) {
      await clearIntegrationConnectionError(connection.id);
    }

    if (allPages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pages found in database",
        imported: 0,
      });
    }

    // Get existing clients for matching
    const clients = await prisma.client.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    let imported = 0;
    let skipped = 0;
    const results: Array<{ name: string; status: string; client?: string }> = [];

    for (const page of allPages) {
      try {
        const props = extractPageProperties(page);

        const name = props[mapping.name];
        if (!name) {
          skipped++;
          continue;
        }

        // Match client by name
        let clientId: string | null = null;
        const clientName = props[mapping.client];
        if (clientName) {
          const matchedClient = clients.find(
            (c) => c.name.toLowerCase() === clientName.toLowerCase()
          );
          clientId = matchedClient?.id || null;
        }

        // Check if project exists
        const existing = await prisma.project.findFirst({
          where: {
            workspaceId,
            name: { equals: name, mode: "insensitive" },
          },
        });

        const projectData = {
          name,
          clientId,
          currency: props[mapping.currency] || "INR",
          totalBudget: props[mapping.rate] ? Math.round(props[mapping.rate] * 100) : null,
          startDate: props[mapping.startDate] ? new Date(props[mapping.startDate]) : null,
          endDate: props[mapping.endDate] ? new Date(props[mapping.endDate]) : null,
          notes: "Imported from Notion",
        };

        if (existing) {
          await prisma.project.update({
            where: { id: existing.id },
            data: projectData,
          });
          results.push({ name, status: "updated", client: clientName });
        } else {
          await prisma.project.create({
            data: {
              workspaceId,
              ...projectData,
            },
          });
          results.push({ name, status: "created", client: clientName });
        }

        imported++;

        await prisma.notionImport.create({
          data: {
            connectionId: connection.id,
            notionDatabaseId: databaseId,
            notionPageId: page.id.replace(/-/g, ""),
            notionPageTitle: name,
            importType: "PROJECT",
            status: "COMPLETED",
          },
        });
      } catch (pageError) {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} projects`,
      imported,
      skipped,
      total: allPages.length,
      results: results.slice(0, 20),
    });
  } catch (error) {
    console.error("[Notion Import Projects Error]", error);
    return NextResponse.json({ error: "Failed to import projects" }, { status: 500 });
  }
}
