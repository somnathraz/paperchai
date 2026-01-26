/**
 * AI Slack Extraction Endpoint
 * POST /api/ai/slack/extract
 *
 * Uses Gemini AI to extract invoice data from Slack messages
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAI } from "@/lib/unified-ai-service";
import { AI_CONFIG } from "@/lib/ai-config";
import { SYSTEM_PROMPTS } from "@/lib/ai-prompt-security";

// SYSTEM_PROMPT moved to lib/ai-prompt-security.ts as extract_slack_invoice
// Using centralized prompt for consistency and security

type ExtractRequest = {
  text: string;
  workspaceId: string;
  importId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: ExtractRequest = await request.json();

    if (!body.text || body.text.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Text too short to extract meaningful data",
      });
    }

    if (!body.workspaceId) {
      return NextResponse.json({
        success: false,
        error: "Workspace ID required",
      });
    }

    // Get workspace currency default
    const workspace = await prisma.workspace.findUnique({
      where: { id: body.workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json({
        success: false,
        error: "Workspace not found",
      });
    }

    // Call Gemini AI
    const response = await generateAI({
      modelName: AI_CONFIG.features.extraction.model,
      fallbackModelName: AI_CONFIG.features.extraction.fallback,
      systemInstruction: SYSTEM_PROMPTS.extract_slack_invoice,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
      promptParts: [
        {
          text: `Extract invoice data from this Slack message / conversation: \n\n${body.text} `,
        },
      ],
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
      console.error("[Slack AI] Failed to parse response:", response);
      return NextResponse.json({
        success: false,
        error: "AI returned invalid response",
        raw: response,
      });
    }

    // Validate extraction
    if (!parsed.success || !parsed.items || parsed.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: parsed.error || "Could not extract invoice data from the text",
        confidence: parsed.confidence || 0,
      });
    }

    // Create draft invoice if client is identified
    let invoiceId: string | null = null;

    if (parsed.client && parsed.items.length > 0) {
      // Try to find or create client
      let client = await prisma.client.findFirst({
        where: {
          workspaceId: body.workspaceId,
          name: { contains: parsed.client, mode: "insensitive" },
        },
      });

      if (!client) {
        // Create a new client
        client = await prisma.client.create({
          data: {
            workspaceId: body.workspaceId,
            name: parsed.client,
          },
        });
      }

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { workspaceId: body.workspaceId },
      });
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

      // Calculate totals
      const items = parsed.items.map((item: any) => ({
        title: item.title || "Service",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      }));

      const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
      const taxTotal = items.reduce(
        (sum: number, item: any) => sum + item.total * (item.taxRate / 100),
        0
      );

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: body.workspaceId,
          clientId: client.id,
          number: invoiceNumber,
          status: "draft",
          currency: parsed.currency || "INR",
          subtotal,
          taxTotal,
          total: subtotal + taxTotal,
          notes: parsed.notes || `Created from Slack import`,
          issueDate: new Date(),
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          source: "slack",
          sourceImportId: body.importId,
          items: {
            create: items,
          },
        },
      });

      invoiceId = invoice.id;
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      summary: parsed.summary || "Invoice data extracted successfully",
      confidence: parsed.confidence || 75,
      invoiceId,
      clientFound: !!parsed.client,
      itemCount: parsed.items?.length || 0,
    });
  } catch (error: any) {
    console.error("[Slack AI Extraction Error]", error);

    if (error.message?.includes("Rate limit")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { success: false, error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}
