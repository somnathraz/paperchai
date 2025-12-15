/**
 * AI Invoice Generate API
 * POST /api/ai/invoice/generate
 * 
 * Uses Gemini to generate invoice items from natural language prompts.
 * OWASP LLM Top 10 compliant with prompt sanitization and output validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateContentSafe } from "@/lib/ai-service";
import { AI_CONFIG } from "@/lib/ai-config";
import {
    processAiInput,
    validateAiOutput,
    invoiceItemsOutputSchema,
    SYSTEM_PROMPTS,
} from "@/lib/ai-prompt-security";
import {
    checkAiGuard,
    acquireJobSlot,
    releaseJobSlot,
    cacheResult,
    AiBudgetTier,
} from "@/lib/ai-budget";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

type GenerateRequest = {
    prompt: string;
    clientName?: string;
    projectName?: string;
    currency?: string;
};

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let jobAcquired = false;
    let workspaceId: string | null = null;

    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get workspace
        const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
        if (!workspace) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }
        workspaceId = workspace.id;  // Store for cleanup
        const tier = ((session.user as any).tier || "FREE") as AiBudgetTier;

        // 3. Parse request
        const body: GenerateRequest = await request.json();

        if (!body.prompt || body.prompt.trim().length < 3) {
            return NextResponse.json({ error: "Prompt is required (min 3 chars)" }, { status: 400 });
        }

        // 4. Process input through security layer
        // IMPORTANT: Action is ENDPOINT-DEFINED, not user-supplied
        const securityContext = {
            workspaceId: workspace.id,
            userId: session.user.id,
            action: "extract_invoice_items" as const,  // Endpoint controls this!
            sourceType: "user_input" as const,
        };

        const processed = processAiInput(body.prompt, securityContext);

        // 5. Check risk assessment
        if (processed.riskAssessment.level === "critical") {
            console.warn("[AI SECURITY] Blocked high-risk prompt", {
                userId: session.user.id,
                riskScore: processed.riskAssessment.score,
                flags: processed.riskAssessment.flags,
            });
            return NextResponse.json({
                error: "Request contains content that cannot be processed. Please describe the invoice items you need.",
                riskFlags: processed.riskAssessment.flags,
            }, { status: 400 });
        }

        // 6. Check budget, concurrency, and cache
        const guard = await checkAiGuard(
            workspace.id,
            processed.contentHash,
            "extract_invoice_items",
            tier,
        );

        // Return cached result if available
        if (guard.cachedResult) {
            return NextResponse.json({
                success: true,
                cached: true,
                ...guard.cachedResult as object,
            });
        }

        if (!guard.allowed) {
            return NextResponse.json({
                error: guard.error,
                remaining: guard.budgetCheck.remaining,
                limit: guard.budgetCheck.dailyLimit,
            }, { status: 429 });
        }

        // 7. Acquire job slot
        acquireJobSlot(workspace.id);
        jobAcquired = true;

        // 8. Build context-aware prompt
        let userPrompt = processed.sanitizedContent;
        if (body.clientName) userPrompt += `\n\nClient: ${body.clientName}`;
        if (body.projectName) userPrompt += `\nProject: ${body.projectName}`;
        if (body.currency) userPrompt += `\nCurrency: ${body.currency}`;

        // 9. Call Gemini with ENDPOINT-CONTROLLED system prompt
        const response = await generateContentSafe({
            modelName: AI_CONFIG.features.extraction.model,
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            systemInstruction: SYSTEM_PROMPTS.extract_invoice_items,  // Strict system prompt
            generationConfig: {
                temperature: 0.2,  // Lower = more deterministic
                maxOutputTokens: 2048,
            },
            promptParts: [{ text: userPrompt }],
            userId: session.user.id,
            userTier: tier === "FREE" ? "FREE" : "PREMIUM",
        });

        // 10. Validate and parse output through Zod schema
        // Prevents LLM02 (Insecure Output Handling)
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7);
        if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3);
        if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3);

        const validationResult = validateAiOutput(cleanedResponse.trim(), invoiceItemsOutputSchema);

        if (!validationResult.success) {
            console.error("[AI] Invalid output:", validationResult.error, cleanedResponse);
            return NextResponse.json({
                error: "AI returned invalid data. Please try again.",
            }, { status: 500 });
        }

        // 11. Build normalized result
        const result = {
            items: validationResult.data.items.map(item => ({
                title: item.title,
                description: item.description || "",
                quantity: item.quantity,
                unitPrice: item.rate,
                taxRate: 0,
            })),
            notes: validationResult.data.notes || null,
            confidence: validationResult.data.confidence,
            warnings: [],
        };

        // 12. Cache the result
        cacheResult(guard.cacheKey, result, "extract_invoice_items");

        // 13. Audit log
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                workspaceId: workspace.id,
                action: "AI_INVOICE_GENERATE",
                resourceType: "INVOICE",
                metadata: {
                    promptLength: body.prompt.length,
                    riskScore: processed.riskAssessment.score,
                    riskFlags: processed.riskAssessment.flags,
                    itemsGenerated: result.items.length,
                    durationMs: Date.now() - startTime,
                    cached: false,
                },
            },
        });

        return NextResponse.json({
            success: true,
            cached: false,
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
    } finally {
        // Release job slot on cleanup
        if (jobAcquired && workspaceId) {
            releaseJobSlot(workspaceId);
        }
    }
}

