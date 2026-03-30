/**
 * Notion Import Clients Endpoint
 * POST /api/integrations/notion/import/clients
 *
 * Import clients from a Notion database
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
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Premium Check
    const premiumError = await requirePremium(request);
    if (premiumError) return premiumError;

    // 3. Rate Limiting
    // 4. Resolve workspace from DB
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

    // 5. Check daily import limit
    const importLimit = await checkDailyImportLimit(workspaceId, planCode);
    if (!importLimit.allowed) {
      return NextResponse.json({ error: importLimit.error }, { status: 429 });
    }

    // 6. Parse request
    const body = await request.json();
    const { databaseId, fieldMapping, preview } = body;

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID required" }, { status: 400 });
    }

    // Default field mapping (can be customized via UI)
    const mapping = fieldMapping || {
      name: "Name",
      email: "Email",
      phone: "Phone",
      taxId: "GSTIN",
      company: "Company",
      tags: "Tags",
    };

    // 7. Get Notion connection
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: "NOTION",
        },
      },
    });

    if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
      return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
    }

    // 8. Decrypt token
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

    // 9. Fetch pages from database
    let allPages: any[] = [];

    // If preview, just fetch one page (default page size) to get 5-10 items
    if (preview) {
      const response = await queryDatabase(accessToken, databaseId, undefined, 5); // Fetch 5 for preview
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
            email: props[mapping.email] || null,
            phone: props[mapping.phone] || null,
            taxId: props[mapping.taxId] || null,
            company: props[mapping.company] || null,
            tags: Array.isArray(props[mapping.tags])
              ? props[mapping.tags].join(", ")
              : props[mapping.tags],
          },
          original: props,
        });
      }

      return NextResponse.json({
        success: true,
        preview: true,
        data: previewResults,
        fieldMapping: mapping, // Return used mapping so UI knows defaults
      });
    }

    // ... Existing full import logic ...
    let cursor: string | undefined;

    do {
      const response = await queryDatabase(accessToken, databaseId, cursor);
      if (response.error) {
        return handleNotionError(response.error);
      }
      allPages = allPages.concat(response.results || []);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor && allPages.length < 500); // Cap at 500 clients

    if (connection.lastError) {
      await clearIntegrationConnectionError(connection.id);
    }

    if (allPages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pages found in database",
        imported: 0,
        skipped: 0,
      });
    }

    // 10. Process each page
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const page of allPages) {
      try {
        const props = extractPageProperties(page);

        // Get client name (required)
        const name = props[mapping.name];
        if (!name) {
          skipped++;
          results.push({ name: "Unknown", status: "skipped", error: "No name found" });
          continue;
        }

        // Check if client already exists
        const existing = await prisma.client.findFirst({
          where: {
            workspaceId,
            OR: [
              { name: { equals: name, mode: "insensitive" } },
              ...(props[mapping.email] ? [{ email: props[mapping.email] }] : []),
            ],
          },
        });

        if (existing) {
          // Update existing client
          await prisma.client.update({
            where: { id: existing.id },
            data: {
              email: props[mapping.email] || existing.email,
              phone: props[mapping.phone] || existing.phone,
              taxId: props[mapping.taxId] || existing.taxId,
              company: props[mapping.company] || existing.company,
              tags: Array.isArray(props[mapping.tags])
                ? props[mapping.tags].join(", ")
                : props[mapping.tags] || existing.tags,
            },
          });
          results.push({ name, status: "updated" });
        } else {
          // Create new client
          await prisma.client.create({
            data: {
              workspaceId,
              name,
              email: props[mapping.email],
              phone: props[mapping.phone],
              taxId: props[mapping.taxId],
              company: props[mapping.company] || name,
              tags: Array.isArray(props[mapping.tags])
                ? props[mapping.tags].join(", ")
                : props[mapping.tags],
              notes: "Imported from Notion",
            },
          });
          results.push({ name, status: "created" });
        }

        imported++;

        // Create import record
        await prisma.notionImport.create({
          data: {
            connectionId: connection.id,
            notionDatabaseId: databaseId,
            notionPageId: page.id.replace(/-/g, ""),
            notionPageTitle: name,
            importType: "CLIENT",
            status: "COMPLETED",
          },
        });
      } catch (pageError: any) {
        errors++;
        results.push({ name: "Error", status: "error", error: pageError.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} clients`,
      imported,
      skipped,
      errors,
      total: allPages.length,
      results: results.slice(0, 20), // Return first 20 for preview
    });
  } catch (error) {
    console.error("[Notion Import Clients Error]", error);
    return NextResponse.json({ error: "Failed to import clients" }, { status: 500 });
  }
}
