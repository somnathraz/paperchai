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
import { notionImportSchema, sanitizeJson } from "@/lib/validation/integration-schemas";
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

    // daily import limit removed for analysis preview

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
      if (isProviderAuthError("NOTION", dbResponse.error)) {
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
    }

    if (connection.lastError) {
      await clearIntegrationConnectionError(connection.id);
    }

    let pages = dbResponse.results || [];

    // Filter by selected page IDs if provided
    if (pageIds && pageIds.length > 0) {
      // Notion IDs might have hyphens or not, ensure we match correctly
      // converting both to no-hyphens for comparison
      const selectedIds = new Set(pageIds.map((id: string) => id.replace(/-/g, "")));
      pages = pages.filter((page: any) => selectedIds.has(page.id.replace(/-/g, "")));
    } else {
      return NextResponse.json({ error: "No pages selected for analysis" }, { status: 400 });
    }

    if (pages.length === 0) {
      return NextResponse.json({ error: "Selected pages not found" }, { status: 404 });
    }

    // 10. Process each page (Analyze only)
    const analysisResults: Array<{
      pageId: string;
      title: string;
      status: "success" | "error";
      entityType?: string;
      data?: any;
      summary?: string;
      confidence?: number;
      error?: string;
    }> = [];

    // Limit analysis to 5 pages at a time to prevent timeout/rate limits during preview
    for (const page of pages.slice(0, 5)) {
      try {
        // Extract properties
        const properties = extractPageProperties(page);
        const pageId = page.id.replace(/-/g, "");

        // Get page title
        const titleProp = Object.entries(properties).find(
          ([key]) => key.toLowerCase().includes("name") || key.toLowerCase().includes("title")
        );
        const pageTitle = titleProp ? String(titleProp[1]) : "Untitled";

        // Get page content (blocks)
        const blocksResponse = await getPageBlocks(accessToken, page.id);
        const textContent = blocksResponse.results
          ? extractTextFromBlocks(blocksResponse.results)
          : "";

        // Build combined text from properties and page content
        // Format it to make client information in the first section more prominent

        // Split text content to identify first section (first 500 chars or first heading)
        // Use ASCII characters for borders that work everywhere - borders on ALL sides
        const borderWidth = 70;
        const borderChar = "=";
        const sectionChar = "-";
        const borderLine = borderChar.repeat(borderWidth);
        const sectionBorder = sectionChar.repeat(borderWidth);

        // Helper function to create box with borders on all sides (top, bottom, left, right)
        const createBorderedBox = (title: string, content: string, useStrongBorder = false) => {
          const lines = content.split("\n");
          // Calculate max width needed, but cap at borderWidth
          const maxContentLength =
            lines.length > 0 ? Math.max(...lines.map((l) => l.length), 0) : 0;
          const titleLength = title.length;
          const boxWidth = Math.min(
            Math.max(maxContentLength + 4, titleLength + 4, 50),
            borderWidth
          );

          const topBottomChar = useStrongBorder ? borderChar : sectionChar;
          const sideChar = "|";
          const topBottom = topBottomChar.repeat(boxWidth);

          const titleLine = `${sideChar} ${title}${" ".repeat(Math.max(0, boxWidth - titleLength - 3))} ${sideChar}`;
          const separator = `${sideChar}${sectionChar.repeat(Math.max(0, boxWidth - 2))}${sideChar}`;

          const contentLines = lines.map((line) => {
            // Handle long lines by wrapping or truncating
            const displayLine =
              line.length > boxWidth - 4 ? line.substring(0, boxWidth - 7) + "..." : line;
            const padded = displayLine.padEnd(Math.max(0, boxWidth - 4));
            return `${sideChar} ${padded} ${sideChar}`;
          });

          return `${topBottom}\n${titleLine}\n${separator}\n${contentLines.join("\n")}\n${topBottom}`;
        };

        const textLines = textContent.split("\n");
        const firstSectionEnd = Math.min(
          textLines.findIndex(
            (line, idx) =>
              idx > 5 &&
              (line.startsWith("#") ||
                line.startsWith("##") ||
                (line.trim().length === 0 && idx > 10))
          ) || textLines.length,
          20 // First 20 lines max
        );
        const firstSection = textLines.slice(0, firstSectionEnd).join("\n");
        const restOfContent = textLines.slice(firstSectionEnd).join("\n");

        // Format properties with borders
        const propertiesText = Object.entries(properties)
          .map(([k, v]) => {
            const key = k.toLowerCase();
            if (
              key.includes("client") ||
              key.includes("name") ||
              key.includes("email") ||
              key.includes("phone")
            ) {
              return `[CLIENT INFO] ${k}: ${v}`;
            }
            return `${k}: ${v}`;
          })
          .join("\n");

        const combinedText = `
${borderLine}
CLIENT AND PROJECT AGREEMENT DOCUMENT
${borderLine}

CRITICAL: The FIRST SECTION below contains CLIENT INFORMATION
Look carefully in the beginning for:
- Client name/company name (often after "Client:", "Client Name:", "Name:", etc.)
- Contact person name
- Email address
- Phone number
- Address

${createBorderedBox("Page Properties", propertiesText)}

${createBorderedBox("FIRST SECTION - CLIENT INFORMATION (READ THIS CAREFULLY)", firstSection, true)}

${createBorderedBox("REST OF DOCUMENT", restOfContent)}

${createBorderedBox(
  "EXTRACTION INSTRUCTIONS",
  `- The FIRST SECTION above contains CLIENT INFORMATION - extract it carefully
- Look for patterns like "Client:", "Client Name:", "Name:", "1. Client", "Between [Company] and..."
- Extract the ACTUAL COMPANY/CLIENT NAME (not the word "Client" itself)
- Examples:
  * "Client: ABC Corp" -> extract "ABC Corp"
  * "Client Name: XYZ Ltd" -> extract "XYZ Ltd"
  * "1. Client\\n   - Name: TechStart Inc" -> extract "TechStart Inc"
  * "Between Acme Corp and..." -> extract "Acme Corp"
- If only "Client" appears without a name value, return null for client name`,
  true
)}
`.trim();

        // Call the SAME extraction endpoint as PDF wizard
        // This correctly extracts Client + Project + Milestones
        const aiResponse = await fetch(new URL("/api/ai/projects/extract", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Forward auth cookie for session
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            fileMeta: {
              fileKey: `notion/${pageId}`,
              fileName: `${pageTitle}.txt`,
              mimeType: "text/plain",
              size: combinedText.length,
            },
            debugText: combinedText, // Pass text directly (no file upload needed)
          }),
        });

        const aiResult = await aiResponse.json();

        if (aiResult.extract) {
          // Transform to unified format matching PDF wizard output
          const extract = aiResult.extract;
          const mainProject = extract.projects?.[0] || extract;
          const clientData = extract.client || {};

          // Debug log to see what we're getting
          console.log("[Notion Analyze] Extracted data:", JSON.stringify(extract, null, 2));

          analysisResults.push({
            pageId,
            title: pageTitle,
            status: "success",
            entityType: "project", // Agreements always become projects
            data: {
              client: {
                name: clientData.name || clientData.company || pageTitle,
                email: clientData.email || "",
                company: clientData.company || clientData.name || "",
                phone: clientData.phone || "",
                contactPerson: clientData.contactPerson || "",
                address: clientData.address || "",
              },
              project: {
                name: mainProject.name || pageTitle,
                description: mainProject.description || mainProject.scope || "",
                type: "MILESTONE",
                billingStrategy: "PER_MILESTONE",
                // totalBudget can be in mainProject.totalBudget or mainProject.budget
                totalBudget: mainProject.totalBudget || mainProject.budget || 0,
                currency: mainProject.currency || "INR",
                startDate: mainProject.startDate || mainProject.timeline?.startDate,
                endDate: mainProject.endDate || mainProject.timeline?.endDate,
              },
              milestones: (mainProject.milestones || []).map((m: any, i: number) => ({
                title: m.title || `Milestone ${i + 1}`,
                description: m.description || "",
                amount: m.amount || 0,
                expectedDate: m.expectedDate,
                dueDate: m.dueDate,
                orderIndex: m.orderIndex ?? i,
              })),
            },
            summary: `Extracted: ${clientData.name || clientData.company || "Client"} → ${mainProject.name || pageTitle} with ${mainProject.milestones?.length || 0} milestones`,
            confidence: extract.confidence?.project || extract.confidence || 0.7,
          });
        } else {
          analysisResults.push({
            pageId,
            title: pageTitle,
            status: "error",
            error: aiResult.error || "Extraction failed",
          });
        }
      } catch (pageError: any) {
        console.error("[Notion Analysis] Page error:", pageError);
        analysisResults.push({
          pageId: page.id,
          title: "Unknown",
          status: "error",
          error: pageError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: analysisResults,
    });
  } catch (error) {
    console.error("[Notion Analysis Error]", error);
    return NextResponse.json({ error: "Failed to analyze pages" }, { status: 500 });
  }
}
