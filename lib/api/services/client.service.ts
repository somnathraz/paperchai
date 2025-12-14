/**
 * Client Service - Handles all client-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export type CreateClientPayload = {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export const clientService = {
    /**
     * Get all clients
     */
    getAll: async () => {
        return apiClient.get(API_ENDPOINTS.CLIENTS.LIST);
    },

    /**
     * Create new client
     */
    create: async (payload: CreateClientPayload) => {
        return apiClient.post(API_ENDPOINTS.CLIENTS.CREATE, payload);
    },

    /**
     * Update existing client
     */
    update: async (clientId: string, payload: UpdateClientPayload) => {
        return apiClient.patch(API_ENDPOINTS.CLIENTS.UPDATE(clientId), payload);
    },

    /**
     * Delete client
     */
    delete: async (clientId: string) => {
        return apiClient.delete(API_ENDPOINTS.CLIENTS.DELETE(clientId));
    },

    /**
     * Check for duplicate client
     */
    checkDuplicate: async (email: string, phone: string) => {
        return apiClient.post(API_ENDPOINTS.CLIENTS.CHECK_DUPLICATE, { email, phone });
    },
};
