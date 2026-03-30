import { AI_CONFIG } from "./ai-config";
import { PlanCode, PLAN_DEFINITIONS } from "./billing/plans";

export const TIER_LIMITS = {
  FREE: {
    maxInvoices: PLAN_DEFINITIONS.FREE.limits.invoicesPerMonth,
    maxClients: PLAN_DEFINITIONS.FREE.limits.clients,
    maxProjects: PLAN_DEFINITIONS.FREE.limits.projects,
    maxTemplates: PLAN_DEFINITIONS.FREE.limits.templates,
    aiCreditsPerMonth: PLAN_DEFINITIONS.FREE.limits.aiCallsPerMonth,
    canUseAI: PLAN_DEFINITIONS.FREE.features.ai,
    canUseReminders: PLAN_DEFINITIONS.FREE.features.reminders,
    canExportPDF: PLAN_DEFINITIONS.FREE.features.pdfExport,
    canCustomizeBranding: PLAN_DEFINITIONS.FREE.features.customBranding,
    maxFileSize: PLAN_DEFINITIONS.FREE.limits.maxFileSizeBytes,
    maxTokens: PLAN_DEFINITIONS.FREE.limits.maxTokens,
    requestsPerMinute: PLAN_DEFINITIONS.FREE.limits.requestsPerMinute,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: PLAN_DEFINITIONS.FREE.features.integrations,
      maxConnections: PLAN_DEFINITIONS.FREE.limits.integrationsMaxConnections,
      importsPerDay: PLAN_DEFINITIONS.FREE.limits.integrationsImportsPerDay,
      importsPerMinute: PLAN_DEFINITIONS.FREE.limits.integrationsImportsPerMinute,
    },
  },
  PREMIUM: {
    maxInvoices: PLAN_DEFINITIONS.PREMIUM.limits.invoicesPerMonth,
    maxClients: PLAN_DEFINITIONS.PREMIUM.limits.clients,
    maxProjects: PLAN_DEFINITIONS.PREMIUM.limits.projects,
    maxTemplates: PLAN_DEFINITIONS.PREMIUM.limits.templates,
    aiCreditsPerMonth: PLAN_DEFINITIONS.PREMIUM.limits.aiCallsPerMonth,
    canUseAI: PLAN_DEFINITIONS.PREMIUM.features.ai,
    canUseReminders: PLAN_DEFINITIONS.PREMIUM.features.reminders,
    canExportPDF: PLAN_DEFINITIONS.PREMIUM.features.pdfExport,
    canCustomizeBranding: PLAN_DEFINITIONS.PREMIUM.features.customBranding,
    maxFileSize: PLAN_DEFINITIONS.PREMIUM.limits.maxFileSizeBytes,
    maxTokens: PLAN_DEFINITIONS.PREMIUM.limits.maxTokens,
    requestsPerMinute: PLAN_DEFINITIONS.PREMIUM.limits.requestsPerMinute,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: PLAN_DEFINITIONS.PREMIUM.features.integrations,
      maxConnections: PLAN_DEFINITIONS.PREMIUM.limits.integrationsMaxConnections,
      importsPerDay: PLAN_DEFINITIONS.PREMIUM.limits.integrationsImportsPerDay,
      importsPerMinute: PLAN_DEFINITIONS.PREMIUM.limits.integrationsImportsPerMinute,
    },
  },
  PREMIER: {
    maxInvoices: PLAN_DEFINITIONS.PREMIER.limits.invoicesPerMonth,
    maxClients: PLAN_DEFINITIONS.PREMIER.limits.clients,
    maxProjects: PLAN_DEFINITIONS.PREMIER.limits.projects,
    maxTemplates: PLAN_DEFINITIONS.PREMIER.limits.templates,
    aiCreditsPerMonth: PLAN_DEFINITIONS.PREMIER.limits.aiCallsPerMonth,
    canUseAI: PLAN_DEFINITIONS.PREMIER.features.ai,
    canUseReminders: PLAN_DEFINITIONS.PREMIER.features.reminders,
    canExportPDF: PLAN_DEFINITIONS.PREMIER.features.pdfExport,
    canCustomizeBranding: PLAN_DEFINITIONS.PREMIER.features.customBranding,
    maxFileSize: PLAN_DEFINITIONS.PREMIER.limits.maxFileSizeBytes,
    maxTokens: PLAN_DEFINITIONS.PREMIER.limits.maxTokens,
    requestsPerMinute: PLAN_DEFINITIONS.PREMIER.limits.requestsPerMinute,
    models: {
      extraction: AI_CONFIG.features.extraction.model,
      template: AI_CONFIG.features.templateGeneration.model,
    },
    integrations: {
      enabled: PLAN_DEFINITIONS.PREMIER.features.integrations,
      maxConnections: PLAN_DEFINITIONS.PREMIER.limits.integrationsMaxConnections,
      importsPerDay: PLAN_DEFINITIONS.PREMIER.limits.integrationsImportsPerDay,
      importsPerMinute: PLAN_DEFINITIONS.PREMIER.limits.integrationsImportsPerMinute,
      showRecommendations: true,
    },
  },
} as const;

export type UserTier = PlanCode;

// Deprecated compatibility helper. Route truth must come from workspace entitlement snapshots.
export function getUserTier(): UserTier {
  return "FREE";
}
