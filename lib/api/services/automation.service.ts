
/**
 * Automation Service - Handles automation and integration API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

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

export interface IntegrationStatus {
    integrations?: {
        notion?: { connected: boolean };
        slack?: { connected: boolean };
    };
    tier?: string;
}

export const automationService = {
    /**
     * Get running automations and stats
     */
    getAutomations: async () => {
        return apiClient.get<{ success: boolean; automations: AutomationStats }>(API_ENDPOINTS.AUTOMATION.LIST);
    },

    /**
     * Get integration status (Notion, Slack connected?)
     */
    getIntegrationStatus: async () => {
        // This endpoint was seen in integration-recommendations.tsx
        // It might not be in API_ENDPOINTS yet, but we'll use the path directly or add it.
        // Assuming /api/integrations/status
        return apiClient.get<IntegrationStatus>('/integrations/status');
    },

    /**
     * Trigger Notion import manually
     */
    importNotionNotes: async () => {
        return apiClient.post(API_ENDPOINTS.AUTOMATION.NOTION.IMPORT_NOTES, {});
    }
};
