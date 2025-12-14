import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { generateContentSafe } from "@/lib/ai-service";
import { AI_CONFIG } from "@/lib/ai-config";

export type ExtractedBillableItem = {
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    taxRate?: number;
    confidence: number; // 0-1 confidence score
    source: string; // document name where found
};

export type BillableItemsResponse = {
    items: ExtractedBillableItem[];
    totalDocumentsAnalyzed: number;
    warnings: string[];
};

const EXTRACTION_PROMPT = `You are a document analyzer specialized in extracting billable items, rates, and pricing from contracts, agreements, and project documents.

Analyze the provided document text and extract ALL billable items, services, or deliverables with their pricing.

For each item found, extract:
- title: The name/description of the service or deliverable
- description: Additional details about the item (optional)
- quantity: Number of units (default to 1 if not specified)
- unitPrice: Price per unit (extract the number only, no currency symbol)
- currency: Currency code (INR, USD, EUR, GBP, etc.)
- taxRate: Tax rate if mentioned (as percentage number, e.g., 18 for 18%)

IMPORTANT RULES:
1. Convert ALL amounts to numeric values (e.g., "$5,000" → 5000, "₹1,00,000" → 100000)
2. If pricing is per hour/day/month, note it in the description
3. Look for: hourly rates, fixed fees, milestone payments, deliverable costs
4. If currency is not explicitly stated, infer from context (₹ → INR, $ → USD, € → EUR)
5. Include a confidence score (0.0-1.0) for each item

DOCUMENT TEXT:
{DOCUMENT_TEXT}

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "title": "Service name",
      "description": "Optional details",
      "quantity": 1,
      "unitPrice": 10000,
      "currency": "INR",
      "taxRate": 18,
      "confidence": 0.9
    }
  ],
  "warnings": ["Any issues or ambiguities found"]
}

If no billable items are found, return { "items": [], "warnings": ["No billable items found in document"] }`;

/**
 * POST /api/projects/[id]/extract-billable-items
 * 
 * Analyze project documents and extract billable items using AI.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const projectId = params.id;

        // Verify project belongs to workspace
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                workspaceId: workspace.id,
            },
            select: { id: true, name: true },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Get project documents with AI extracts
        const documents = await prisma.projectDocument.findMany({
            where: {
                projectId,
                aiStatus: "PROCESSED", // Only analyze documents that have been processed
            },
            select: {
                id: true,
                fileName: true,
                aiSummary: true,
                aiExtract: true,
            },
        });

        if (documents.length === 0) {
            // No processed documents, try to get raw content if available
            const pendingDocs = await prisma.projectDocument.findMany({
                where: { projectId },
                select: { id: true, fileName: true },
            });

            if (pendingDocs.length === 0) {
                return NextResponse.json({
                    items: [],
                    totalDocumentsAnalyzed: 0,
                    warnings: ["No documents found for this project. Upload a contract or agreement to extract billable items."],
                });
            }

            return NextResponse.json({
                items: [],
                totalDocumentsAnalyzed: 0,
                warnings: [`${pendingDocs.length} document(s) are still being processed. Please try again in a few moments.`],
            });
        }

        // Combine document extracts for AI analysis
        const combinedText = documents.map(doc => {
            const extract = doc.aiExtract as any;
            return `
--- Document: ${doc.fileName} ---
Summary: ${doc.aiSummary || "No summary"}
Content: ${extract?.rawText || extract?.content || JSON.stringify(extract) || "No content available"}
`;
        }).join("\n\n");

        // Call AI to extract billable items
        const prompt = EXTRACTION_PROMPT.replace("{DOCUMENT_TEXT}", combinedText);

        const result = await generateContentSafe({
            modelName: AI_CONFIG.features.extraction.model,
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            promptParts: [prompt],
            generationConfig: {
                temperature: AI_CONFIG.features.extraction.temperature,
                maxOutputTokens: 4096,
            },
            userId: session.user.id,
        });

        // Parse AI response
        let extractedData: { items: ExtractedBillableItem[]; warnings: string[] };
        try {
            // Clean up response - remove markdown code blocks if present
            let jsonStr = result.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.slice(7);
            }
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.slice(3);
            }
            if (jsonStr.endsWith("```")) {
                jsonStr = jsonStr.slice(0, -3);
            }

            extractedData = JSON.parse(jsonStr.trim());
        } catch (parseError) {
            console.error("Failed to parse AI response:", result);
            return NextResponse.json({
                items: [],
                totalDocumentsAnalyzed: documents.length,
                warnings: ["AI extraction returned invalid format. Please try again or add items manually."],
            });
        }

        // Add source document info to items
        const itemsWithSource = extractedData.items.map(item => ({
            ...item,
            source: documents.length === 1 ? documents[0].fileName : "Multiple documents",
        }));

        return NextResponse.json({
            items: itemsWithSource,
            totalDocumentsAnalyzed: documents.length,
            warnings: extractedData.warnings || [],
        } satisfies BillableItemsResponse);

    } catch (error) {
        console.error("Error extracting billable items:", error);
        return NextResponse.json({ error: "Failed to extract billable items" }, { status: 500 });
    }
}

/**
 * GET /api/projects/[id]/extract-billable-items
 * 
 * Get cached billable items from project.billableItems field.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const project = await prisma.project.findFirst({
            where: {
                id: params.id,
                workspaceId: workspace.id,
            },
            select: {
                id: true,
                name: true,
                billableItems: true,
                currency: true,
                milestones: {
                    where: { invoiceId: null },
                    orderBy: { orderIndex: "asc" },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        amount: true,
                        currency: true,
                        status: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Parse billable items from JSON
        const billableItems: ExtractedBillableItem[] = [];
        if (project.billableItems && Array.isArray(project.billableItems)) {
            for (const item of project.billableItems as any[]) {
                billableItems.push({
                    title: item.title || "",
                    description: item.description,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    currency: item.currency || project.currency,
                    taxRate: item.taxRate,
                    confidence: 1.0, // Manual items have full confidence
                    source: "Project configuration",
                });
            }
        }

        // Also include unbilled milestones as potential billable items
        const milestoneItems: ExtractedBillableItem[] = project.milestones.map(m => ({
            title: m.title,
            description: m.description || undefined,
            quantity: 1,
            unitPrice: m.amount / 100, // Convert from smallest unit
            currency: m.currency,
            confidence: 1.0,
            source: `Milestone: ${m.status}`,
        }));

        return NextResponse.json({
            items: [...billableItems, ...milestoneItems],
            totalDocumentsAnalyzed: 0,
            warnings: [],
        } satisfies BillableItemsResponse);

    } catch (error) {
        console.error("Error getting billable items:", error);
        return NextResponse.json({ error: "Failed to get billable items" }, { status: 500 });
    }
}
