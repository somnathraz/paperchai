export const AI_CONFIG = {
    // Centralized model configuration
    models: {
        // Fast model for high-volume tasks (extraction, simple generation)
        // Using Stable Gemini 2.0 Flash (found in available models list)
        fast: "gemini-2.0-flash",

        // Powerful model for complex reasoning or creative tasks
        // 'gemini-1.5-pro' was not in user's list, reusing 2.0 Flash as it's highly capable and available
        powerful: "gemini-2.0-flash",
    },

    // Configuration for specific features
    features: {
        extraction: {
            model: "gemini-2.5-flash", // Upgrade to latest stable found in list
            fallback: "gemini-2.0-flash-lite", // Fallback (Verified Available)
            temperature: 0.1,
        },
        templateGeneration: {
            model: "gemini-2.5-flash",
            fallback: "gemini-2.0-flash-lite",
            temperature: 0.7,
        }
    }
} as const;

export type AiModelType = typeof AI_CONFIG.models.fast | typeof AI_CONFIG.models.powerful;
