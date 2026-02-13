/**
 * Notion Import Endpoint
 * POST /api/integrations/notion/import
 *
 * Imports data from a Notion database
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import {
  queryDatabase,
  getPageBlocks,
  extractTextFromBlocks,
  extractPageProperties,
} from "@/lib/notion-client";
import { requirePremium, checkDailyImportLimit } from "@/lib/middleware/premium-check";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getUserTier } from "@/lib/tier-limits";
import { notionImportSchema, sanitizeJson } from "@/lib/validation/integration-schemas";
import { resolveIntegrationWorkspace, requireIntegrationManager } from "@/lib/integrations/access";

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
    const tier = getUserTier(session.user.id, session.user.email);
    const rateLimit = checkRateLimit(request, session.user.id, tier, "integrations");

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.error }, { status: 429 });
    }

    // 4. Resolve workspace from DB
    const workspace = await resolveIntegrationWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    const workspaceId = workspace.id;
    const canManage = await requireIntegrationManager(session.user.id, workspaceId);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. Check daily import limit
    const importLimit = await checkDailyImportLimit(workspaceId, tier);
    if (!importLimit.allowed) {
      return NextResponse.json({ error: importLimit.error }, { status: 429 });
    }

    // 6. Validate input
    const body = await request.json();
    const validated = notionImportSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { databaseId, pageIds, importType } = sanitizeJson(validated.data);

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

    // 9. Fetch database rows
    const dbResponse = await queryDatabase(accessToken, databaseId);

    if (dbResponse.error) {
      console.error("[Notion Import] Query error:", dbResponse.error);
      return NextResponse.json({ error: "Failed to query Notion database" }, { status: 500 });
    }

    let pages = dbResponse.results || [];

    // Filter by selected page IDs if provided
    if (pageIds && pageIds.length > 0) {
      // Notion IDs might have hyphens or not, ensure we match correctly
      // converting both to no-hyphens for comparison
      const selectedIds = new Set(pageIds.map((id: string) => id.replace(/-/g, "")));
      pages = pages.filter((page: any) => selectedIds.has(page.id.replace(/-/g, "")));
    }

    if (pages.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pages found to import",
        imported: 0,
      });
    }

    // 10. Process each page
    const importResults: Array<{
      pageId: string;
      title: string;
      status: "success" | "error";
      entityType?: string;
      entityId?: string;
      error?: string;
    }> = [];

    for (const page of pages.slice(0, 50)) {
      // Limit to 50 pages per import
      try {
        // Extract properties
        const properties = extractPageProperties(page);
        const pageId = page.id.replace(/-/g, "");

        // Get page title
        const titleProp = Object.entries(properties).find(
          ([key]) => key.toLowerCase().includes("name") || key.toLowerCase().includes("title")
        );
        const pageTitle = titleProp ? String(titleProp[1]) : "Untitled";

        // Create import record
        const notionImport = await prisma.notionImport.create({
          data: {
            connectionId: connection.id,
            notionDatabaseId: databaseId,
            notionPageId: pageId,
            notionPageTitle: pageTitle,
            importType,
            status: "PROCESSING",
          },
        });

        // Get page content (blocks)
        const blocksResponse = await getPageBlocks(accessToken, page.id);
        const textContent = blocksResponse.results
          ? extractTextFromBlocks(blocksResponse.results)
          : "";

        // Call AI extraction
        const aiResponse = await fetch(new URL("/api/ai/notion/extract", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            properties,
            textContent,
            importType,
            workspaceId,
            importId: notionImport.id,
          }),
        });

        const aiResult = await aiResponse.json();

        if (aiResult.success) {
          await prisma.notionImport.update({
            where: { id: notionImport.id },
            data: {
              status: "COMPLETED",
              aiSummary: aiResult.summary,
              extractedData: aiResult.data,
              projectId: aiResult.projectId,
              clientId: aiResult.clientId,
            },
          });

          importResults.push({
            pageId,
            title: pageTitle,
            status: "success",
            entityType: aiResult.entityType,
            entityId: aiResult.entityId,
          });
        } else {
          await prisma.notionImport.update({
            where: { id: notionImport.id },
            data: {
              status: "FAILED",
              errorMessage: aiResult.error,
            },
          });

          importResults.push({
            pageId,
            title: pageTitle,
            status: "error",
            error: aiResult.error,
          });
        }
      } catch (pageError: any) {
        console.error("[Notion Import] Page error:", pageError);
        importResults.push({
          pageId: page.id,
          title: "Unknown",
          status: "error",
          error: pageError.message,
        });
      }
    }

    const successCount = importResults.filter((r) => r.status === "success").length;
    const errorCount = importResults.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} pages, ${errorCount} errors`,
      imported: successCount,
      errors: errorCount,
      total: pages.length,
      results: importResults,
      hasMore: pages.length > 50,
    });
  } catch (error) {
    console.error("[Notion Import Error]", error);
    return NextResponse.json({ error: "Failed to import from Notion" }, { status: 500 });
  }
}
