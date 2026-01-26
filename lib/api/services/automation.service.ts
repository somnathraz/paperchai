/**
 * Automation Service - Handles automation and integration API calls
 */

import { apiClient } from "../client";
import { API_ENDPOINTS } from "../endpoints";

export interface AutomationRun {
  id: string;
  name: string;
  status: "running" | "completed" | "failed";
  trigger: string;
  action: string;
  createdAt: string;
  pageTitle?: string;
  channelName?: string;
  details: string;
}

export interface AutomationStats {
  running: AutomationRun[];
  completed: AutomationRun[];
  failed: AutomationRun[];
  total: number;
}

export interface AutopilotStats {
  isConfigured: boolean;
  status: "ON" | "PARTIAL" | "OFF";
  invoicesCovered: number;
  totalInvoices: number;
  coveragePercent: number;
  last30DaysCollected: number;
  invoicesPaidLast30Days: number;
  avgDaysFaster: number;
}

export interface IntegrationDetails {
  connected: boolean;
  status: string;
  workspaceName?: string;
  lastError?: string | null;
  lastErrorAt?: string | null;
  connectedAt?: string;
}

export interface NotionIntegration extends IntegrationDetails {
  databasesMapped?: number;
  clientsImported?: number;
  projectsImported?: number;
}

export interface SlackIntegration extends IntegrationDetails {
  channelsWatching?: string[];
  threadsToProjects?: number;
  draftInvoices?: number;
}

export interface IntegrationStatus {
  success: boolean;
  tier?: string;
  integrationsEnabled?: boolean;
  limits?: {
    maxConnections: number;
    importsPerDay: number;
    importsPerMinute: number;
  };
  usage?: {
    connectionsUsed: number;
    importsToday: number;
  };
  autopilot?: AutopilotStats;
  integrations?: {
    notion?: NotionIntegration;
    slack?: SlackIntegration;
  };
  // Legacy stats field for backward compatibility
  stats?: {
    invoicesCovered?: number;
    totalInvoices?: number;
    last30DaysCollected?: number;
    avgDaysFaster?: number;
  };
}

export const automationService = {
  /**
   * Get running automations and stats
   */
  getAutomations: async () => {
    return apiClient.get<{ success: boolean; automations: AutomationStats }>(
      API_ENDPOINTS.AUTOMATION.LIST
    );
  },

  /**
   * Get integration status (Notion, Slack connected?)
   */
  getIntegrationStatus: async () => {
    return apiClient.get<IntegrationStatus>("/integrations/status");
  },

  /**
   * Trigger Notion import manually
   */
  importNotionNotes: async () => {
    return apiClient.post(API_ENDPOINTS.AUTOMATION.NOTION.IMPORT_NOTES, {});
  },
};
