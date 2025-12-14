/**
 * AI Invoice Generate API
 * POST /api/ai/invoice/generate
 * 
 * Uses Gemini to generate invoice items, notes, and terms from natural language prompts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateContentSafe } from "@/lib/ai-service";
import { AI_CONFIG } from "@/lib/ai-config";

const SYSTEM_PROMPT = `You are PaperChai AI, an expert invoice assistant. Your job is to generate professional invoice data from user prompts.

ALWAYS respond with valid JSON in this exact format:
{
  "items": [
    {
      "title": "Service/Product name",
      "description": "Optional detailed description",
      "quantity": 1,
      "unitPrice": 10000,
      "taxRate": 0
    }
  ],
  "notes": "Optional professional notes for the client",
  "terms": "Optional payment terms",
  "taxSuggestion": { "type": "GST", "rate": 18 },
  "warnings": ["Any concerns about the request"]
}

Rules:
1. Parse the user's prompt to extract items, quantities, prices
2. If prices aren't specified, estimate reasonable market rates for India (in INR)
3. If user mentions GST or tax, set appropriate taxRate (usually 18% for services in India)
4. Generate professional notes and terms if the context suggests it
5. Add warnings if anything seems unclear or needs attention
6. Keep item titles concise but descriptive
7. Use proper capitalization for titles

IMPORTANT: Only output valid JSON, no markdown, no code blocks, just raw JSON.`;

type GenerateRequest = {
    prompt: string;
    clientName?: string;
    projectName?: string;
    currency?: string;
    context?: any;
};

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: GenerateRequest = await request.json();

        if (!body.prompt || body.prompt.trim().length < 3) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Build context-aware prompt
        let userPrompt = body.prompt;
        if (body.clientName) {
            userPrompt += `\n\nClient: ${body.clientName}`;
        }
        if (body.projectName) {
            userPrompt += `\nProject: ${body.projectName}`;
        }
        if (body.currency) {
            userPrompt += `\nCurrency: ${body.currency}`;
        }

        // Call Gemini
        const response = await generateContentSafe({
            modelName: AI_CONFIG.features.extraction.model,
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
            promptParts: [{ text: userPrompt }],
            userId: session.user.id,
            userTier: (session.user as any).tier || "FREE",
        });

        // Parse the response
        let parsed;
        try {
            // Clean up response - remove markdown code blocks if present
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
            console.error("Failed to parse AI response:", response);
            return NextResponse.json({
                error: "AI returned invalid response",
                raw: response,
            }, { status: 500 });
        }

        // Validate and normalize the response
        const result = {
            items: Array.isArray(parsed.items) ? parsed.items.map((item: any) => ({
                title: item.title || "Service",
                description: item.description || "",
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0,
                taxRate: Number(item.taxRate) || 0,
            })) : [],
            notes: parsed.notes || null,
            terms: parsed.terms || null,
            taxSuggestion: parsed.taxSuggestion || null,
            warnings: parsed.warnings || [],
        };

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error: any) {
        console.error("AI Generate error:", error);

        if (error.message?.includes("Rate limit")) {
            return NextResponse.json({ error: error.message }, { status: 429 });
        }

        return NextResponse.json(
            { error: "Failed to generate invoice data" },
            { status: 500 }
        );
    }
}
