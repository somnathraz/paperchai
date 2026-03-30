import OpenAI from "openai";
import { AI_CONFIG } from "./ai-config";
import { TIER_LIMITS, UserTier } from "./tier-limits";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Simple in-memory rate limiter (Same as Gemini)
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
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  promptParts: { text: string }[];
  userId?: string;
  userTier?: UserTier;
};

export async function generateWithOpenAI(options: GenerationOptions): Promise<string> {
  // 1. Check User Rate Limit
  if (options.userId && !checkRateLimit(options.userId, options.userTier)) {
    throw new Error(
      `Rate limit exceeded for ${options.userTier || "FREE"} plan. Please upgrade or wait.`
    );
  }

  // 2. Try Primary Model
  try {
    console.log(`[OpenAI] Generating with ${options.modelName}...`);
    return await attemptGeneration(options.modelName, options);
  } catch (error: any) {
    const isQuotaError = error.status === 429 || error.message?.includes("rate_limit");

    // 3. Try Fallback if Quota Error
    if (isQuotaError && options.fallbackModelName) {
      console.warn(
        `[OpenAI] Quota exceeded for ${options.modelName}. Switching to fallback: ${options.fallbackModelName}`
      );
      try {
        return await attemptGeneration(options.fallbackModelName, options);
      } catch (fallbackError) {
        console.error(`[OpenAI] Fallback failed too:`, fallbackError);
        throw fallbackError; // Both failed
      }
    }

    console.error(`[OpenAI] Generation failed:`, error);
    throw error; // Not a quota error or no fallback
  }
}

async function attemptGeneration(modelName: string, options: GenerationOptions): Promise<string> {
  // Combine prompt parts into single user message
  const userMessage = options.promptParts.map((part) => part.text).join("\n");

  // Determine if we should enforce JSON mode
  const shouldUseJsonMode = options.generationConfig?.responseMimeType === "application/json";

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      ...(options.systemInstruction
        ? [{ role: "system" as const, content: options.systemInstruction }]
        : []),
      { role: "user" as const, content: userMessage },
    ],
    temperature: options.generationConfig?.temperature ?? 0.2,
    max_tokens: options.generationConfig?.maxOutputTokens,
    // Enforce JSON mode if requested
    ...(shouldUseJsonMode
      ? {
          response_format: { type: "json_object" as const },
        }
      : {}),
  });

  const response = completion.choices[0]?.message?.content || "";

  if (!response) {
    throw new Error("OpenAI returned empty response");
  }

  return response;
}
