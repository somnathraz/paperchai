export type AiProvider = "google" | "openai";

export const AI_CONFIG = {
  // Provider Selection (instant switch via env var)
  provider: (process.env.AI_PROVIDER || "google") as AiProvider,

  // Google Gemini Configuration
  google: {
    models: {
      // Fast model for high-volume tasks (extraction, simple generation)
      fast: "gemini-2.0-flash",

      // Powerful model for complex reasoning or creative tasks
      powerful: "gemini-2.0-flash",
    },
    features: {
      extraction: {
        model: "gemini-2.5-flash", // Latest stable
        fallback: "gemini-2.0-flash-lite", // Fallback
        temperature: 0.1,
      },
      templateGeneration: {
        model: "gemini-2.5-flash",
        fallback: "gemini-2.0-flash-lite",
        temperature: 0.7,
      },
    },
  },

  // OpenAI Configuration
  openai: {
    models: {
      // Cost-effective model for extraction ($0.15/M input)
      fast: "gpt-4o-mini",

      // More powerful model for complex tasks
      powerful: "gpt-4o",
    },
    features: {
      extraction: {
        model: "gpt-4o-mini", // Most cost-effective
        fallback: "gpt-3.5-turbo", // Even cheaper fallback
        temperature: 0.1,
      },
      templateGeneration: {
        model: "gpt-4o-mini",
        fallback: "gpt-3.5-turbo",
        temperature: 0.7,
      },
    },
  },

  // Legacy support (maps to current provider)
  get models() {
    return this.provider === "openai" ? this.openai.models : this.google.models;
  },
  get features() {
    return this.provider === "openai" ? this.openai.features : this.google.features;
  },
} as const;

export type AiModelType =
  | typeof AI_CONFIG.google.models.fast
  | typeof AI_CONFIG.google.models.powerful
  | typeof AI_CONFIG.openai.models.fast
  | typeof AI_CONFIG.openai.models.powerful;
