import { AI_CONFIG } from "./ai-config";
import { generateContentSafe } from "./ai-service";
import { generateWithOpenAI } from "./openai-service";
import { UserTier } from "./tier-limits";

type UnifiedGenerationOptions = {
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

/**
 * Unified AI generation function that routes to the correct provider
 * Supports instant switching between Google Gemini and OpenAI
 */
export async function generateAI(options: UnifiedGenerationOptions): Promise<string> {
  const provider = AI_CONFIG.provider;

  console.log(`[AI] Using provider: ${provider}`);

  if (provider === "openai") {
    return await generateWithOpenAI(options);
  } else {
    return await generateContentSafe(options);
  }
}
