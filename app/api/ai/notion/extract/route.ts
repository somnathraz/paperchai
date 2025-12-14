/**
 * AI Notion Extraction Endpoint
 * POST /api/ai/notion/extract
 * 
 * Uses Gemini AI to extract project/client data from Notion pages
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContentSafe } from "@/lib/ai-service";
import { AI_CONFIG } from "@/lib/ai-config";

const SYSTEM_PROMPT = `You are PaperChai AI, an expert at extracting business data from Notion pages.

Your job is to analyze Notion page properties and content, then extract structured data for creating Projects or Clients.

ALWAYS respond with valid JSON in this exact format:

For PROJECT import type:
{
  "success": true,
  "entityType": "project",
  "name": "Project name",
  "description": "Project description",
  "client": "Client name (or null)",
  "status": "active",
  "budget": 100000,
  "currency": "INR",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "billableItems": [
    { "title": "Deliverable", "description": "Details", "rate": 50000 }
  ],
  "confidence": 85,
  "summary": "Brief summary of extracted data"
}

For CLIENT import type:
{
  "success": true,
  "entityType": "client",
  "name": "Client/Company name",
  "company": "Company name",
  "contactPerson": "Contact person name",
  "email": "email@example.com",
  "phone": "phone number",
  "address": "Address",
  "notes": "Any notes",
  "confidence": 85,
  "summary": "Brief summary"
}

For TASK or INVOICE_DATA, extract what's relevant and set entityType to "task" or "invoice".

Rules:
1. Extract names, dates, amounts from properties first
2. Use text content for descriptions and details
3. Set confidence based on data quality (0-100)
4. If data is too vague, set success to false with an error
5. Currency defaults to INR unless specified
6. Parse dates in any format, output as YYYY-MM-DD

IMPORTANT: Only output valid JSON, no markdown, no code blocks.`;

type ExtractRequest = {
    properties: Record<string, any>;
    textContent: string;
    importType: string;
    workspaceId: string;
    importId?: string;
};

export async function POST(request: NextRequest) {
    try {
        const body: ExtractRequest = await request.json();

        if (!body.properties && !body.textContent) {
            return NextResponse.json({
                success: false,
                error: "No content to extract",
            });
        }

        if (!body.workspaceId) {
            return NextResponse.json({
                success: false,
                error: "Workspace ID required",
            });
        }

        // Build prompt with properties and content
        const propertiesText = Object.entries(body.properties || {})
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join("\n");

        const prompt = `Import type: ${body.importType}

Notion Page Properties:
${propertiesText || "No properties"}

Page Content:
${body.textContent || "No additional content"}

Extract the relevant data for this ${body.importType.toLowerCase()} import.`;

        // Call Gemini AI
        const response = await generateContentSafe({
            modelName: AI_CONFIG.features.extraction.model,
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
            promptParts: [{ text: prompt }],
            userId: "system",
            userTier: "PREMIUM",
        });

        // Parse AI response
        let parsed;
        try {
            let cleanedResponse = response.trim();
            if (cleanedResponse.startsWith("```json")) {
                cleanedResponse = cleanedResponse.slice(7);
            }
            if (cleanedResponse.startsWith("```")) {
                cleanedResponse = cleanedResponse.slice(3);
            }
            if (cleanedResponse.endsWith("```")) {
                cleanedResponse = cleanedResponse.slice(0, -3);
            }
            parsed = JSON.parse(cleanedResponse.trim());
        } catch (parseError) {
            console.error("[Notion AI] Failed to parse response:", response);
            return NextResponse.json({
                success: false,
                error: "AI returned invalid response",
            });
        }

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: parsed.error || "Could not extract data",
                confidence: parsed.confidence || 0,
            });
        }

        // Create entity based on type
        let entityId: string | null = null;
        let entityType = parsed.entityType || body.importType.toLowerCase();

        if (entityType === "project" && parsed.name) {
            // Find or create client if specified
            let clientId: string | null = null;
            if (parsed.client) {
                let client = await prisma.client.findFirst({
                    where: {
                        workspaceId: body.workspaceId,
                        name: { contains: parsed.client, mode: "insensitive" },
                    },
                });

                if (!client) {
                    client = await prisma.client.create({
                        data: {
                            workspaceId: body.workspaceId,
                            name: parsed.client,
                        },
                    });
                }
                clientId = client.id;
            }

            // Create project
            const project = await prisma.project.create({
                data: {
                    workspaceId: body.workspaceId,
                    name: parsed.name,
                    description: parsed.description || "",
                    clientId,
                    status: "ACTIVE",
                    type: "FIXED",
                    billingStrategy: "SINGLE_INVOICE",
                    totalBudget: parsed.budget || null,
                    currency: parsed.currency || "INR",
                    startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                    endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                    billableItems: parsed.billableItems ? JSON.stringify(parsed.billableItems) : undefined,
                    notes: `Imported from Notion`,
                },
            });

            entityId = project.id;

            return NextResponse.json({
                success: true,
                entityType: "project",
                entityId: project.id,
                projectId: project.id,
                clientId,
                data: parsed,
                summary: parsed.summary || `Created project: ${parsed.name}`,
                confidence: parsed.confidence || 75,
            });
        }

        if (entityType === "client" && parsed.name) {
            // Create client
            const client = await prisma.client.create({
                data: {
                    workspaceId: body.workspaceId,
                    name: parsed.name,
                    company: parsed.company || parsed.name,
                    contactPerson: parsed.contactPerson,
                    email: parsed.email,
                    phone: parsed.phone,
                    notes: parsed.notes || `Imported from Notion`,
                },
            });

            entityId = client.id;

            return NextResponse.json({
                success: true,
                entityType: "client",
                entityId: client.id,
                clientId: client.id,
                data: parsed,
                summary: parsed.summary || `Created client: ${parsed.name}`,
                confidence: parsed.confidence || 75,
            });
        }

        // For other types, just return the extracted data
        return NextResponse.json({
            success: true,
            entityType,
            data: parsed,
            summary: parsed.summary || "Data extracted successfully",
            confidence: parsed.confidence || 75,
        });

    } catch (error: any) {
        console.error("[Notion AI Extraction Error]", error);

        if (error.message?.includes("Rate limit")) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { success: false, error: "Failed to extract data" },
            { status: 500 }
        );
    }
}
