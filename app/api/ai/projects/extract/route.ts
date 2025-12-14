import { AI_CONFIG } from "@/lib/ai-config";
import { generateContentSafe } from "@/lib/ai-service";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = getUserTier(session.user.id, session.user.email || "");
    const limits = TIER_LIMITS[tier];

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await req.json();
    const { fileMeta, existingClientId } = body;

    if (!fileMeta || !fileMeta.fileKey) {
        return NextResponse.json({ error: "File metadata required" }, { status: 400 });
    }

    // Enforce File Size Limit
    if (fileMeta.size > limits.maxFileSize) {
        return NextResponse.json({
            error: `File too large for ${tier} tier. Max size: ${limits.maxFileSize / (1024 * 1024)}MB. Upgrade to Premium for 10MB limits.`
        }, { status: 403 });
    }

    try {
        // 1. Fetch file content
        let fileData = body.fileData || body.debugText || "";
        const isBase64 = body.isBase64 || false;

        if (!fileData && !body.debugText) {
            fileData = "Contract for Website Redesign with Acme Corp. Total budget $5000. Milestone 1: Design (50%) due 2025-01-01. Milestone 2: Code (50%) due 2025-02-01.";
        }

        const systemPrompt = `
You are *Senior Legal & Project Manager AI* for PaperChai (Freelance Automation SaaS).
Your goal is to extract **clean, strictly structured project data** from messy documents
(contracts, proposals, PDFs, emails, SOWs).

===========================
1. EXTRACTION RULES (MANDATORY)
===========================

1. NEVER hallucinate missing amounts, dates, or milestone names.
2. If unsure, leave a field empty or null.
3. If multiple projects or services exist, output them as **separate project entries**.
4. Identify the **client** (the payer) at ALL costs:
   - Check signatures
   - Check "Client" section
   - Check email headers
   - Check "Between:" or address blocks
5. Identify the **service provider** but DO NOT include in output.
6. Extract all **dates** as YYYY-MM-DD.
7. Extract all money into **smallest units** (e.g., INR 12000 → 1200000 paise).
8. Summaries must NOT introduce new information.
9. Follow the JSON schema strictly.

===========================
2. WHAT TO DETECT
===========================

A. CLIENT DATA  
- name  
- email  
- company  
- phone  
- notes (anything useful like GST, address, special terms)

B. PROJECT STRUCTURE  
For each project found in the document, detect:

1. Project name (use section headings if unclear)
2. Description (short)
3. Project type:
   - FIXED
   - HOURLY
   - RETAINER
   - MILESTONE
4. Billing strategy:
   - PER_MILESTONE
   - SINGLE_INVOICE
   - RETAINER_MONTHLY
   - HOURLY_TIMESHEET
5. Currency (default to INR unless document clearly uses USD/EUR)
6. Budget:
   - If a total fee is described → convert to smallest units
   - If hourly → no totalBudget
   - If retainer → monthly fee = amount
7. Start and end dates (infer year from context ONLY if safe)
8. Milestones:
   For each milestone:
   - title
   - description
   - amount (convert to smallest unit)
   - expectedDate (delivery date or estimated date)
   - dueDate (payment due date, if given)
   - If milestone is unclear → include it but leave missing fields null

===========================
3. HALLUCINATION PREVENTION
===========================

- If document contains ambiguous billing terms, list them in warnings.
- If timeline is unclear, do NOT guess — leave null.
- If amounts are missing, leave amount = null.
- If multiple possible interpretations exist, pick the safer one and add warning:
  “Ambiguous milestone structure—multiple interpretations possible.”

===========================
4. OUTPUT SCHEMA (STRICT)
===========================

Return ONLY valid JSON. No markdown, no text.

{
  "client": {
     "name": "",
     "email": "",
     "company": "",
     "phone": "",
     "notes": ""
  },
  "projects": [
    {
      "name": "",
      "description": "",
      "type": "FIXED" | "HOURLY" | "RETAINER" | "MILESTONE",
      "billingStrategy": "PER_MILESTONE" | "SINGLE_INVOICE" | "RETAINER_MONTHLY" | "HOURLY_TIMESHEET",
      "totalBudget": null | number,
      "currency": "INR",
      "startDate": "",
      "endDate": "",
      "milestones": [
        {
          "title": "",
          "description": "",
          "amount": null | number,
          "expectedDate": "",
          "dueDate": ""
        }
      ]
    }
  ],
  "confidence": {
     "client": 0.0,
     "projects": 0.0
  },
  "warnings": []
}

===========================
5. FINAL SAFETY CHECK
===========================

Before outputting JSON:

- Ensure ALL amounts are numeric or null (no strings like "$4000").
- Ensure dates follow "YYYY-MM-DD".
- Ensure "type" and "billingStrategy" use EXACT enum strings.
- Ensure JSON is valid, strict, minified if possible.

Return JSON only. Never include explanation.
`;

        let promptParts: any[] = [{ text: systemPrompt }];

        // Enforce Token Limit Approximation (Substring)
        // 1 char ~= 1 byte. Token limit is rough.
        const maxChars = limits.maxTokens * 4; // Very rough approx for char limit

        if (isBase64 && (fileMeta.mimeType === "application/pdf" || fileMeta.fileName.endsWith(".pdf"))) {
            promptParts.push({
                inlineData: {
                    data: fileData,
                    mimeType: "application/pdf"
                }
            });
            promptParts.push({ text: "Extract details from the attached PDF document." });
        } else {
            promptParts[0].text += `\n\nInput Text:\n${fileData.substring(0, maxChars)}`;
        }

        // 2. Call AI Service (Handles Fallback & Rate Limiting)
        const text = await generateContentSafe({
            modelName: limits.models.extraction, // Use tier-based model (though currently same)
            fallbackModelName: AI_CONFIG.features.extraction.fallback,
            promptParts: promptParts,
            generationConfig: { responseMimeType: "application/json" },
            userId: session.user.id,
            userTier: tier
        });

        // Clean markdown if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let extract = JSON.parse(cleanText);

        // 3. Persist ProjectDocument result
        await prisma.projectDocument.create({
            data: {
                workspaceId: workspace.id,
                clientId: existingClientId,
                fileKey: fileMeta.fileKey,
                fileName: fileMeta.fileName,
                mimeType: fileMeta.mimeType,
                size: fileMeta.size || 0,
                sourceType: "OTHER", // Could detect from mimeType
                aiStatus: "PROCESSED",
                aiExtract: extract,
                aiSummary: `Extracted ${extract.projects?.length || 1} projects. Main: ${extract.projects?.[0]?.name || extract.project?.name}`,
                createdByUserId: session.user.id
            }
        });

        return NextResponse.json({ extract });

    } catch (error: any) {
        console.error("AI Extraction failed:", error);

        // Log failure in DB
        try {
            await prisma.projectDocument.create({
                data: {
                    workspaceId: workspace.id,
                    fileKey: fileMeta.fileKey,
                    fileName: fileMeta.fileName || "unknown",
                    mimeType: fileMeta.mimeType || "application/octet-stream",
                    size: 0,
                    aiStatus: "FAILED",
                    createdByUserId: session.user.id
                }
            });
        } catch (e) { /* ignore */ }

        // Specific handling for user rate limit error
        if (error.message?.includes("Rate limit exceeded")) {
            return NextResponse.json({ error: error.message }, { status: 429 });
        }

        return NextResponse.json({ error: "Failed to extract data" }, { status: 500 });
    }
}
