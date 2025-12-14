import { NextResponse } from "next/server";
import { AI_CONFIG } from "@/lib/ai-config";
import { generateContentSafe } from "@/lib/ai-service";
import { getServerSession } from "next-auth"; // Need session for rate limiting
import { authOptions } from "@/lib/auth";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        const tier = userId ? getUserTier(userId, session?.user?.email || "") : "FREE";
        const limits = TIER_LIMITS[tier];

        const { prompt, type, tone } = await req.json();

        let systemInstruction = "";
        if (type === "email") {
            // ... (keep instruction same)
            systemInstruction = `
        You are a professional business communication assistant specializing in invoice reminders.
        Generate an email template based on the user's request.
        The output MUST be a SINGLE JSON object with exactly two keys: "subject" and "body".
        
        IMPORTANT RULES:
        1. Return ONLY a single JSON object { "subject": "...", "body": "..." }. Do NOT return an array.
        2. Do NOT wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\`. Return raw JSON only.
        3. Variables must be in Handlebars format: {{clientName}}, {{invoiceId}}, {{amount}}, {{dueDate}}
        4. Keep ALL existing variables exactly as they appear - do NOT remove or modify them
        5. "body" should be plain text with \\n for line breaks.
        6. Subject should be concise (under 60 characters)
        
        Tone: ${tone || "Professional"}
      `;
        } else {
            // ... (keep instruction same)
            systemInstruction = `
        You are a professional business communication assistant.
        Generate a WhatsApp message template based on the user's request.
        The output MUST be in JSON format with one key: "body".
        Variables should be in Handlebars format like {{clientName}}, {{invoiceId}}, {{amount}}, {{dueDate}}, {{paymentLink}}.
        Keep it concise and friendly suitable for WhatsApp.
        
        Tone: ${tone || "Professional"}
      `;
        }

        const text = await generateContentSafe({
            modelName: limits.models.template, // Tier-based model
            fallbackModelName: AI_CONFIG.features.templateGeneration.fallback,
            systemInstruction: systemInstruction,
            promptParts: [{ text: "Request: " + prompt }],
            generationConfig: { responseMimeType: "application/json" },
            userId: userId,
            userTier: tier
        });

        // Sanitize: Remove markdown code blocks if present
        let sanitizedText = text.replace(/```json\n?|```/g, "").trim();

        console.log("AI Raw Text:", sanitizedText); // Debug log

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(sanitizedText);

            // Handle array response (AI sometimes returns [ { ... } ])
            if (Array.isArray(jsonResponse)) {
                jsonResponse = jsonResponse[0];
            }
        } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error("Failed to parse AI response as JSON");
        }

        console.log("Parsed JSON:", jsonResponse); // Debug log

        // Validate expected keys for email
        if (type === "email" && (!jsonResponse?.subject || !jsonResponse?.body)) {
            console.error("Missing keys:", Object.keys(jsonResponse || {}));
            throw new Error("Invalid response format from AI: Missing subject or body");
        }

        return NextResponse.json(jsonResponse);
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        if (error.message?.includes("User rate limit exceeded")) {
            return NextResponse.json({ error: error.message }, { status: 429 });
        }
        return NextResponse.json(
            { error: "Failed to generate template", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
