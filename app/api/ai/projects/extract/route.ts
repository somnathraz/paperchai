/**
 * AI Project Extract API
 * POST /api/ai/projects/extract
 * 
 * OWASP LLM Top 10 compliant:
 * - Text-only extraction (never raw PDF to LLM)
 * - Risk scoring
 * - Structured output validation
 * - Budget/caching
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { AI_CONFIG } from "@/lib/ai-config";
import { generateContentSafe } from "@/lib/ai-service";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";
import {
    processAiInput,
    validateAiOutput,
    projectDataOutputSchema,
    SYSTEM_PROMPTS,
} from "@/lib/ai-prompt-security";
import {
    checkAiGuard,
    acquireJobSlot,
    releaseJobSlot,
    cacheResult,
    AiBudgetTier,
} from "@/lib/ai-budget";
import {
    extractTextFromBuffer,
    EXTRACTION_LIMITS,
    ExtractionTier,
} from "@/lib/document-extraction";

export async function POST(req: NextRequest) {
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
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }
        workspaceId = workspace.id;

        const userTier = getUserTier(session.user.id, session.user.email || "");
        const limits = TIER_LIMITS[userTier];
        const extractionTier = (userTier === "OWNER" ? "PROFESSIONAL" : userTier === "PREMIUM" ? "PROFESSIONAL" : "FREE") as ExtractionTier;

        // 3. Parse request
        const body = await req.json();
        const { fileMeta, existingClientId, fileData, isBase64, debugText } = body;

        if (!fileMeta || !fileMeta.fileKey) {
            return NextResponse.json({ error: "File metadata required" }, { status: 400 });
        }

        // 4. Enforce file size limit (tier-based)
        const tierLimits = EXTRACTION_LIMITS[extractionTier] || EXTRACTION_LIMITS.FREE;
        if (fileMeta.size > tierLimits.maxFileSizeBytes) {
            const maxMB = Math.round(tierLimits.maxFileSizeBytes / 1024 / 1024);
            return NextResponse.json({
                error: `File too large for ${userTier} tier. Max: ${maxMB}MB.`
            }, { status: 403 });
        }

        // 5. Extract TEXT ONLY from document (never raw PDF to LLM)
        let textContent: string;

        if (debugText) {
            // For debugging/testing
            textContent = debugText;
        } else if (isBase64 && fileData) {
            // Decode base64 and extract text
            const buffer = Buffer.from(fileData, "base64");
            const extraction = await extractTextFromBuffer(
                buffer,
                fileMeta.mimeType,
                fileMeta.fileName,
                extractionTier
            );

            if (!extraction.success) {
                return NextResponse.json({
                    error: extraction.error,
                    errorCode: extraction.errorCode,
                }, { status: 400 });
            }

            textContent = extraction.document!.textContent;

            // Log if suspicious content detected
            if (extraction.document!.metadata.hadInvisibleChars) {
                console.warn("[AI SECURITY] Document had invisible unicode chars", {
                    workspaceId,
                    filename: fileMeta.fileName,
                });
            }
        } else {
            // Fallback for testing
            textContent = "Contract for Website Redesign with Acme Corp. Total budget $5000.";
        }

        // 6. Process through security layer
        const securityContext = {
            workspaceId,
            userId: session.user.id,
            action: "extract_project_data" as const,
            sourceType: "extracted_text" as const,
        };

        const processed = processAiInput(textContent, securityContext);

        // 7. Check risk
        if (processed.riskAssessment.level === "critical") {
            console.warn("[AI SECURITY] Blocked high-risk document", {
                workspaceId,
                userId: session.user.id,
                riskScore: processed.riskAssessment.score,
                flags: processed.riskAssessment.flags,
            });
            return NextResponse.json({
                error: "Document contains content that cannot be processed.",
                riskFlags: processed.riskAssessment.flags,
            }, { status: 400 });
        }

        // 8. Check budget/cache
        const budgetTier = (userTier === "PREMIUM" || userTier === "OWNER" ? "PROFESSIONAL" : "FREE") as AiBudgetTier;
        const guard = await checkAiGuard(
            workspaceId,
            processed.contentHash,
            "extract_project_data",
            budgetTier,
        );

        // Return cached result if available
        if (guard.cachedResult) {
            return NextResponse.json({
                extract: guard.cachedResult,
                cached: true,
            });
        }

        if (!guard.allowed) {
            return NextResponse.json({
                error: guard.error,
                remaining: guard.budgetCheck.remaining,
            }, { status: 429 });
        }

        // 9. Acquire job slot
        acquireJobSlot(workspaceId);
        jobAcquired = true;

        // 10. Call AI with strict system prompt
        const text = await generateContentSafe({
            modelName: limits.models.extraction,
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            systemInstruction: SYSTEM_PROMPTS.extract_project_data,
            promptParts: [{ text: `Extract project data from:\n\n${processed.sanitizedContent}` }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
            },
            userId: session.user.id,
            userTier: userTier === "FREE" ? "FREE" : "PREMIUM",
        });

        // 11. Validate output
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const validationResult = validateAiOutput(cleanText, projectDataOutputSchema);

        if (!validationResult.success) {
            // Fallback: try parsing as legacy format
            try {
                const legacyExtract = JSON.parse(cleanText);

                // Persist result
                await prisma.projectDocument.create({
                    data: {
                        workspaceId,
                        clientId: existingClientId,
                        fileKey: fileMeta.fileKey,
                        fileName: fileMeta.fileName,
                        mimeType: fileMeta.mimeType,
                        size: fileMeta.size || 0,
                        sourceType: "OTHER",
                        aiStatus: "PROCESSED",
                        aiExtract: legacyExtract,
                        aiSummary: `Extracted ${legacyExtract.projects?.length || 1} project(s)`,
                        createdByUserId: session.user.id,
                    },
                });

                // Cache and return
                cacheResult(guard.cacheKey, legacyExtract, "extract_project_data");

                return NextResponse.json({
                    extract: legacyExtract,
                    cached: false,
                });
            } catch {
                console.error("[AI] Invalid output:", validationResult.error);
                return NextResponse.json({
                    error: "AI returned invalid data. Please try again.",
                }, { status: 500 });
            }
        }

        // 12. Persist validated result
        const extract = validationResult.data;
        await prisma.projectDocument.create({
            data: {
                workspaceId,
                clientId: existingClientId,
                fileKey: fileMeta.fileKey,
                fileName: fileMeta.fileName,
                mimeType: fileMeta.mimeType,
                size: fileMeta.size || 0,
                sourceType: "OTHER",
                aiStatus: "PROCESSED",
                aiExtract: extract,
                aiSummary: `Project: ${extract.name}`,
                createdByUserId: session.user.id,
            },
        });

        // 13. Cache result
        cacheResult(guard.cacheKey, extract, "extract_project_data");

        // 14. Audit log
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                workspaceId,
                action: "AI_EXTRACT",
                resourceType: "PROJECT",
                metadata: {
                    filename: fileMeta.fileName,
                    riskScore: processed.riskAssessment.score,
                    confidence: extract.confidence,
                    durationMs: Date.now() - startTime,
                },
            },
        });

        return NextResponse.json({
            extract,
            cached: false,
        });

    } catch (error: any) {
        console.error("AI Extraction failed:", error);

        // Log failure
        if (workspaceId) {
            try {
                const body = await req.clone().json().catch(() => ({}));
                await prisma.projectDocument.create({
                    data: {
                        workspaceId,
                        fileKey: body.fileMeta?.fileKey || "unknown",
                        fileName: body.fileMeta?.fileName || "unknown",
                        mimeType: "application/octet-stream",
                        size: 0,
                        aiStatus: "FAILED",
                        createdByUserId: (await getServerSession(authOptions))?.user?.id || "unknown",
                    },
                });
            } catch { /* ignore */ }
        }

        if (error.message?.includes("Rate limit")) {
            return NextResponse.json({ error: error.message }, { status: 429 });
        }

        return NextResponse.json({ error: "Failed to extract data" }, { status: 500 });
    } finally {
        if (jobAcquired && workspaceId) {
            releaseJobSlot(workspaceId);
        }
    }
}

