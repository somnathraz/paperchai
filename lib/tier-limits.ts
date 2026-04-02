import { AI_CONFIG } from "./ai-config";

export const TIER_LIMITS = {
  FREE: {
    maxInvoices: 10,
    maxClients: 5,
    maxProjects: 3,
    maxTemplates: 1,
    aiCreditsPerMonth: 0,
    canUseAI: false,
    canUseReminders: false,
    canExportPDF: false,
    canCustomizeBranding: false,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxTokens: 10000,
    requestsPerMinute: 3,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: false,
      maxConnections: 0,
      importsPerDay: 0,
      importsPerMinute: 0,
    },
  },
  PREMIUM: {
    maxInvoices: 100,
    maxClients: 50,
    maxProjects: 30,
    maxTemplates: 10,
    aiCreditsPerMonth: 100,
    canUseAI: true,
    canUseReminders: true,
    canExportPDF: true,
    canCustomizeBranding: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTokens: 32000,
    requestsPerMinute: 20,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: true,
      maxConnections: 5,
      importsPerDay: 500,
      importsPerMinute: 10,
    },
  },
  OWNER: {
    maxInvoices: -1, // unlimited
    maxClients: -1,
    maxProjects: -1,
    maxTemplates: -1,
    aiCreditsPerMonth: -1,
    canUseAI: true,
    canUseReminders: true,
    canExportPDF: true,
    canCustomizeBranding: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxTokens: 100000,
    requestsPerMinute: 100,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: true,
      maxConnections: 10,
      importsPerDay: -1, // unlimited
      importsPerMinute: 10,
      showRecommendations: true,
    },
  },
} as const;

export type UserTier = keyof typeof TIER_LIMITS;

export function getUserTier(userId: string, email?: string): UserTier {
  // Owner bypass via env var — set OWNER_EMAILS as a comma-separated list
  const ownerEmails = (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (email && ownerEmails.includes(email)) {
    return "OWNER";
  }

  // NOTE: Tier is currently FREE for all users during beta.
  // Wire this to a Stripe subscription or User.tier DB field before launching paid plans.
  return "FREE";
}
