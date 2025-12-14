
/**
 * Reminder Service - Handles reminder-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface RemindersDashboardData {
    queue: any[];
    upcoming: any[];
    health: {
        deliveryRate: number;
        failedCount: number;
        openRate: number;
    };
    failures: any[]; // Add failures list
}

export const reminderService = {
    /**
     * Get all reminder dashboard data
     * Corresponds to /api/dashboard/reminders
     */
    getDashboardData: async () => {
        // We might want to add this to API_ENDPOINTS if used frequently
        return apiClient.get('/dashboard/reminders');
    },

    /**
     * Send a reminder immediately
     */
    sendReminder: async (invoiceId: string, channel: string) => {
        return apiClient.post(API_ENDPOINTS.INVOICES.SEND, { invoiceId, channel });
    },

    /**
     * Get timeline for an invoice
     */
    getTimeline: async (invoiceId: string) => {
        return apiClient.get(API_ENDPOINTS.REMINDERS.TIMELINE(invoiceId));
    }
};
