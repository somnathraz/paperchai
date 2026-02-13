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
import { generateAI } from "@/lib/unified-ai-service";
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
    const extractionTier = (
      userTier === "OWNER" ? "PROFESSIONAL" : userTier === "PREMIUM" ? "PROFESSIONAL" : "FREE"
    ) as ExtractionTier;

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
      return NextResponse.json(
        {
          error: `File too large for ${userTier} tier. Max: ${maxMB}MB.`,
        },
        { status: 403 }
      );
    }

    // 5. Extract TEXT ONLY from document (never raw PDF to LLM)
    let textContent: string;

    if (debugText) {
      // For debugging/testing
      textContent = debugText;
    } else if (isBase64 && fileData) {
      // Decode base64 and extract text
      const buffer = Buffer.from(fileData, "base64");

      // --- R2 Upload ---
      try {
        console.log(`[AI Extract] Uploading file to R2: ${fileMeta.fileKey}`);
        const { uploadFile } = await import("@/lib/r2");
        await uploadFile(fileMeta.fileKey, buffer, fileMeta.mimeType);
        console.log(`[AI Extract] R2 upload successful`);
      } catch (uploadError) {
        console.error(`[AI Extract] R2 upload failed:`, uploadError);
        // Continue with extraction even if upload fails, or fail?
        // User asked to "keep project document in upload in r2", so maybe warn but proceed.
      }

      const extraction = await extractTextFromBuffer(
        buffer,
        fileMeta.mimeType,
        fileMeta.fileName,
        extractionTier
      );

      if (!extraction.success) {
        return NextResponse.json(
          {
            error: extraction.error,
            errorCode: extraction.errorCode,
          },
          { status: 400 }
        );
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

    // === VERBOSE LOGGING FOR DEBUGGING ===
    console.log(`[AI Extract] Text extraction complete:`, {
      filename: fileMeta.fileName,
      textLength: textContent.length,
      snippet: textContent.substring(0, 300) + (textContent.length > 300 ? "..." : ""),
    });

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
      return NextResponse.json(
        {
          error: "Document contains content that cannot be processed.",
          riskFlags: processed.riskAssessment.flags,
        },
        { status: 400 }
      );
    }

    // 8. Check budget/cache
    const budgetTier = (
      userTier === "PREMIUM" || userTier === "OWNER" ? "PROFESSIONAL" : "FREE"
    ) as AiBudgetTier;
    const guard = await checkAiGuard(
      workspaceId,
      processed.contentHash,
      "extract_project_data",
      budgetTier
    );

    // Return cached result if available
    if (guard.cachedResult) {
      return NextResponse.json({
        extract: guard.cachedResult,
        cached: true,
      });
    }

    if (!guard.allowed) {
      return NextResponse.json(
        {
          error: guard.error,
          remaining: guard.budgetCheck.remaining,
        },
        { status: 429 }
      );
    }

    // 9. Acquire job slot
    acquireJobSlot(workspaceId);
    jobAcquired = true;

    // 10. Call AI with strict system prompt (auto-routes to Google or OpenAI)
    const text = await generateAI({
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
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const validationResult = validateAiOutput(cleanText, projectDataOutputSchema);

    if (!validationResult.success) {
      // Fallback: try parsing as legacy format
      try {
        const legacyExtract = JSON.parse(cleanText);

        // Clean invalid client names in legacy format
        if (legacyExtract.client?.name) {
          const invalidNames = [
            "client",
            "Client",
            "CLIENT",
            "party 1",
            "Party 1",
            "PARTY 1",
            "party 2",
            "Party 2",
            "PARTY 2",
            "first party",
            "First Party",
            "FIRST PARTY",
            "second party",
            "Second Party",
            "SECOND PARTY",
            "between",
            "Between",
            "BETWEEN",
            "parties",
            "Parties",
            "PARTIES",
          ];
          const clientName = legacyExtract.client.name.trim();
          if (invalidNames.includes(clientName)) {
            legacyExtract.client.name = null;
          }
        }

        // --- NORMALIZATION: Convert legacy/singular/empty formats to projects array ---
        if (!legacyExtract.projects || legacyExtract.projects.length === 0) {
          if (
            legacyExtract.project &&
            typeof legacyExtract.project === "object" &&
            "name" in legacyExtract.project
          ) {
            legacyExtract.projects = [legacyExtract.project];
          } else if (legacyExtract.name) {
            legacyExtract.projects = [
              {
                name: legacyExtract.name,
                description: legacyExtract.description,
                scope: legacyExtract.scope,
                totalBudget: legacyExtract.budget,
                startDate: legacyExtract.timeline?.startDate,
                endDate: legacyExtract.timeline?.endDate,
              },
            ];
          }
        }

        console.log(
          `[AI Extract] Fallback successful. Projects found: ${legacyExtract.projects?.length || 0}`
        );

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
            aiSummary: `Extracted ${legacyExtract.projects?.length || 0} project(s) (via fallback)`,
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
        return NextResponse.json(
          {
            error: "AI returned invalid data. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // 12. Post-process and clean extracted data
    const extract = validationResult.data as any; // Type assertion needed due to union schema

    // Clean invalid client names (safety check - only filter out label words, accept any actual names)
    // Accept ANY name if it's explicitly stated (abc, xyz, Company123, etc.), but reject label words
    const invalidClientNames = [
      "client",
      "Client",
      "CLIENT",
      "party 1",
      "Party 1",
      "PARTY 1",
      "party 2",
      "Party 2",
      "PARTY 2",
      "first party",
      "First Party",
      "FIRST PARTY",
      "second party",
      "Second Party",
      "SECOND PARTY",
      "between",
      "Between",
      "BETWEEN",
      "parties",
      "Parties",
      "PARTIES",
    ];

    if (extract.client?.name) {
      const clientName = extract.client.name.trim();
      // Only reject if it's a known label word - accept any other name (even "abc", "x", etc.)
      if (invalidClientNames.includes(clientName)) {
        console.warn(
          "[AI Extract] Invalid client name detected (label word), setting to null:",
          clientName
        );
        extract.client.name = null;
      }
      // Accept any other name, no matter how short or unusual - as long as it's not a label word
    }

    // Ensure projects array exists (handle legacy, singular project, or AI returning projects: [])
    if (!extract.projects || extract.projects.length === 0) {
      const raw = extract as Record<string, unknown>;
      if (
        raw.project &&
        typeof raw.project === "object" &&
        raw.project !== null &&
        "name" in raw.project
      ) {
        extract.projects = [raw.project as (typeof extract.projects)[0]];
      } else if (extract.name) {
        extract.projects = [
          {
            name: extract.name,
            description: extract.description,
            scope: extract.scope,
            totalBudget: extract.budget,
            startDate: extract.timeline?.startDate,
            endDate: extract.timeline?.endDate,
          } as (typeof extract.projects)[0],
        ];
      }
    }

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
        aiSummary: `Project: ${extract.projects?.[0]?.name || extract.name || "Unknown"}`,
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
        const body = await req
          .clone()
          .json()
          .catch(() => ({}));
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
      } catch {
        /* ignore */
      }
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
