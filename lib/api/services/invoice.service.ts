/**
 * Invoice Service - Handles all invoice-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { InvoiceFormState } from '@/components/invoices/invoice-form';

export type SaveInvoicePayload = InvoiceFormState & {
    templateSlug?: string;
    sections?: any[];
    reminderCadence?: string;
    attachments?: any[];
};

export type SendInvoicePayload = {
    invoiceId: string;
    channel: 'email' | 'whatsapp' | 'both';
};

export type ScheduleInvoicePayload = {
    invoiceId: string;
    scheduledSendAt: string;
    channel: 'email' | 'whatsapp' | 'both';
    templateSlug?: string;
    reminderCadence?: string;
};

export const invoiceService = {
    /**
     * Get all invoices
     */
    getAll: async () => {
        return apiClient.get(API_ENDPOINTS.INVOICES.LIST);
    },

    /**
     * Save invoice (create or update)
     */
    save: async (payload: SaveInvoicePayload) => {
        return apiClient.post(API_ENDPOINTS.INVOICES.SAVE, payload);
    },

    /**
     * Send invoice immediately
     */
    send: async (payload: SendInvoicePayload) => {
        return apiClient.post(API_ENDPOINTS.INVOICES.SEND, payload);
    },

    /**
     * Schedule invoice for future send
     */
    schedule: async (payload: ScheduleInvoicePayload) => {
        return apiClient.post(API_ENDPOINTS.INVOICES.SCHEDULE, payload);
    },

    /**
     * Get invoice PDF
     */
    getPdf: async (invoiceId: string) => {
        return apiClient.get(API_ENDPOINTS.INVOICES.PDF(invoiceId));
    },

    /**
     * Save reminder settings for invoice
     */
    saveReminders: async (invoiceId: string, settings: any) => {
        return apiClient.post(API_ENDPOINTS.INVOICES.REMINDERS(invoiceId), settings);
    },
};
