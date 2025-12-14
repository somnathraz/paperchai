import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_CONFIG } from "./ai-config";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Simple in-memory rate limiter (Token Bucket lite)
import { TIER_LIMITS, UserTier } from "./tier-limits";

// ... imports

// Map<UserId, { count: number, resetAt: number }>
const usageMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string, tier: UserTier = "FREE"): boolean {
    const now = Date.now();
    let usage = usageMap.get(userId);

    if (!usage || now > usage.resetAt) {
        usage = { count: 0, resetAt: now + WINDOW_MS };
    }

    const limit = TIER_LIMITS[tier].requestsPerMinute;

    if (usage.count >= limit) {
        return false;
    }

    usage.count++;
    usageMap.set(userId, usage);
    return true;
}

type GenerationOptions = {
    modelName: string;
    fallbackModelName?: string;
    systemInstruction?: string;
    generationConfig?: any;
    promptParts: any[];
    userId?: string; // For rate limiting
    userTier?: UserTier;
};

export async function generateContentSafe(options: GenerationOptions) {
    // 1. Check User Rate Limit
    if (options.userId && !checkRateLimit(options.userId, options.userTier)) {
        throw new Error(`Rate limit exceeded for ${options.userTier || "FREE"} plan. Please upgrade or wait.`);
    }

    // ... rest of function

    // 2. Try Primary Model
    try {
        console.log(`[AI] Generating with ${options.modelName}...`);
        return await attemptGeneration(options.modelName, options);
    } catch (error: any) {
        const isQuotaError = error.message?.includes("429") || error.status === 429;

        // 3. Try Fallback if Quota Error
        if (isQuotaError && options.fallbackModelName) {
            console.warn(`[AI] Quota exceeded for ${options.modelName}. Switching to fallback: ${options.fallbackModelName}`);
            try {
                return await attemptGeneration(options.fallbackModelName, options);
            } catch (fallbackError) {
                console.error(`[AI] Fallback failed too:`, fallbackError);
                throw fallbackError; // Both failed
            }
        }

        console.error(`[AI] Generation failed:`, error);
        throw error; // Not a quota error or no fallback
    }
}

async function attemptGeneration(modelName: string, options: GenerationOptions) {
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: options.promptParts }],
        generationConfig: options.generationConfig
    });

    return result.response.text();
}
