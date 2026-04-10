export type PlanCode = "FREE" | "PREMIUM" | "PREMIER";

export type PlanFeatureKey =
  | "invoices"
  | "estimates"
  | "clients"
  | "pdfExport"
  | "integrations"
  | "ai"
  | "reminders"
  | "automation"
  | "recurringPlans"
  | "approvalWorkflows"
  | "customBranding"
  | "teams"
  | "api";

export type PlanLimits = {
  invoicesPerMonth: number;
  clients: number;
  projects: number;
  members: number;
  templates: number;
  aiCallsPerMonth: number;
  reminderEmailsPerMonth: number;
  automationRules: number;
  recurringPlans: number;
  integrationsMaxConnections: number;
  integrationsImportsPerDay: number;
  integrationsImportsPerMinute: number;
  requestsPerMinute: number;
  maxFileSizeBytes: number;
  maxTokens: number;
};

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  description: string;
  badge?: string;
  highlights: string[];
  pricing: {
    INR: { monthly: number; yearly: number };
    USD: { monthly: number; yearly: number };
  };
  features: PlanFeatures;
  limits: PlanLimits;
};

export const BILLING_INTERVALS = ["month", "year"] as const;
export const BILLING_CURRENCIES = ["INR", "USD"] as const;

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  FREE: {
    code: "FREE",
    name: "Free",
    description: "Core invoicing for solo users getting started.",
    highlights: [
      "Up to 5 clients",
      "10 invoices / month",
      "Basic PDF invoices",
      "1 automation rule to try",
      "Notion import (10/day) · Slack read-only",
    ],
    pricing: {
      INR: { monthly: 0, yearly: 0 },
      USD: { monthly: 0, yearly: 0 },
    },
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: true, // allow connecting Notion + Slack to try
      ai: false,
      reminders: false,
      automation: true, // 1 rule allowed (enforced by automationRules limit)
      recurringPlans: false,
      approvalWorkflows: false,
      customBranding: false,
      teams: false,
      api: false,
    },
    limits: {
      invoicesPerMonth: 10,
      clients: 5,
      projects: 3,
      members: 1,
      templates: 1,
      aiCallsPerMonth: 0,
      reminderEmailsPerMonth: 0,
      automationRules: 1, // try one automation
      recurringPlans: 0,
      integrationsMaxConnections: 2, // one Notion + one Slack
      integrationsImportsPerDay: 10, // limited Notion imports per day
      integrationsImportsPerMinute: 2,
      requestsPerMinute: 5,
      maxFileSizeBytes: 5 * 1024 * 1024,
      maxTokens: 10000,
    },
  },
  PREMIUM: {
    code: "PREMIUM",
    name: "Premium",
    description: "Automation and AI for solo professionals.",
    badge: "Most Popular",
    highlights: [
      "Up to 50 clients",
      "100 invoices / month",
      "AI + reminders + recurring invoices",
      "Slack and Notion integrations",
    ],
    pricing: {
      INR: { monthly: 14900, yearly: 149000 },
      USD: { monthly: 900, yearly: 9000 },
    },
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: true,
      ai: true,
      reminders: true,
      automation: true,
      recurringPlans: true,
      approvalWorkflows: true,
      customBranding: true,
      teams: false,
      api: true,
    },
    limits: {
      invoicesPerMonth: 100,
      clients: 50,
      projects: 30,
      members: 1,
      templates: 25,
      aiCallsPerMonth: 100,
      reminderEmailsPerMonth: 500,
      automationRules: 10,
      recurringPlans: 10,
      integrationsMaxConnections: 5,
      integrationsImportsPerDay: 500,
      integrationsImportsPerMinute: 10,
      requestsPerMinute: 20,
      maxFileSizeBytes: 10 * 1024 * 1024,
      maxTokens: 32000,
    },
  },
  PREMIER: {
    code: "PREMIER",
    name: "Premier",
    description: "Team-ready invoicing with higher limits and collaboration.",
    highlights: [
      "5 team members included",
      "Unlimited invoices, clients, and projects",
      "Higher AI and automation limits",
      "Team approvals and collaboration",
    ],
    pricing: {
      INR: { monthly: 49900, yearly: 499000 },
      USD: { monthly: 2900, yearly: 29000 },
    },
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: true,
      ai: true,
      reminders: true,
      automation: true,
      recurringPlans: true,
      approvalWorkflows: true,
      customBranding: true,
      teams: true,
      api: true,
    },
    limits: {
      invoicesPerMonth: -1,
      clients: -1,
      projects: -1,
      members: 5,
      templates: -1,
      aiCallsPerMonth: 500,
      reminderEmailsPerMonth: 5000,
      automationRules: 100,
      recurringPlans: 100,
      integrationsMaxConnections: 10,
      integrationsImportsPerDay: 5000,
      integrationsImportsPerMinute: 20,
      requestsPerMinute: 60,
      maxFileSizeBytes: 25 * 1024 * 1024,
      maxTokens: 100000,
    },
  },
};

export const PLAN_CODE_ALIASES: Record<string, PlanCode> = {
  FREE: "FREE",
  PRO: "PREMIUM",
  PREMIUM: "PREMIUM",
  STUDIO: "PREMIER",
  PREMIER: "PREMIER",
};

export function normalizePlanCode(code?: string | null): PlanCode {
  if (!code) return "FREE";
  return PLAN_CODE_ALIASES[code.toUpperCase()] || "FREE";
}

export function getPlanDefinition(code?: string | null): PlanDefinition {
  return PLAN_DEFINITIONS[normalizePlanCode(code)];
}

const PLAN_TIER_ORDER: PlanCode[] = ["FREE", "PREMIUM", "PREMIER"];

export function planTier(code: PlanCode): number {
  return PLAN_TIER_ORDER.indexOf(code);
}

export function isPlanUpgrade(from: PlanCode, to: PlanCode): boolean {
  return planTier(to) > planTier(from);
}

export function isPlanDowngrade(from: PlanCode, to: PlanCode): boolean {
  return planTier(to) < planTier(from);
}
