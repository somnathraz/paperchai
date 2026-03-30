/**
 * Project Service - Handles all project-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export type CreateProjectPayload = {
    name: string;
    description?: string;
    clientId: string;
    status?: string;
    billableItems?: Array<{ title: string; quantity: number; unitPrice: number }>;
    milestones?: Array<{ title: string; description?: string; amount: number; currency: string }>;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export const projectService = {
    /**
     * Get all projects
     */
    getAll: async () => {
        return apiClient.get(API_ENDPOINTS.PROJECTS.LIST);
    },

    /**
     * Get project by ID
     */
    getById: async (projectId: string) => {
        return apiClient.get(API_ENDPOINTS.PROJECTS.DETAIL(projectId));
    },

    /**
     * Create new project
     */
    create: async (payload: CreateProjectPayload) => {
        return apiClient.post(API_ENDPOINTS.PROJECTS.CREATE, payload);
    },

    /**
     * Update existing project
     */
    update: async (projectId: string, payload: UpdateProjectPayload) => {
        return apiClient.patch(API_ENDPOINTS.PROJECTS.UPDATE(projectId), payload);
    },

    /**
     * Delete project
     */
    delete: async (projectId: string) => {
        return apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(projectId));
    },

    /**
     * Get project milestones
     */
    /**
     * Get project milestones
     */
    getMilestones: async (projectId: string) => {
        return apiClient.get(API_ENDPOINTS.PROJECTS.MILESTONES(projectId));
    },

    /**
     * Create milestone
     */
    createMilestone: async (projectId: string, payload: any) => {
        return apiClient.post(API_ENDPOINTS.PROJECTS.MILESTONES(projectId), payload);
    },

    /**
     * Update milestone
     */
    updateMilestone: async (milestoneId: string, payload: any) => {
        return apiClient.patch(`/milestones/${milestoneId}`, payload);
    },

    /**
     * Delete milestone
     */
    deleteMilestone: async (milestoneId: string) => {
        return apiClient.delete(`/milestones/${milestoneId}`);
    },
};
