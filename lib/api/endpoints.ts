/**
 * Centralized API Endpoints Catalog
 * 
 * All API routes are defined here for easy maintenance and type safety.
 * Use these constants instead of hardcoded strings throughout the app.
 */

export const API_ENDPOINTS = {
    // ==================== AUTH ====================
    AUTH: {
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        LOGOUT: '/auth/logout',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_EMAIL: '/auth/verify-email',
    },

    // ==================== USER ====================
    USER: {
        SETTINGS: '/user/settings',
        PROFILE: '/user/profile',
    },

    // ==================== DASHBOARD ====================
    DASHBOARD: {
        STATS: '/dashboard/stats',
        RECENT_ACTIVITY: '/dashboard/recent-activity',
        CASHFLOW: '/dashboard/cashflow',
        INVOICES: '/dashboard/invoices',
    },

    // ==================== INVOICES ====================
    INVOICES: {
        LIST: '/invoices/list',
        SAVE: '/invoices/save',
        SEND: '/invoices/send',
        SCHEDULE: '/invoices/schedule',
        DETAIL: (id: string) => `/invoices/${id}`,
        PDF: (id: string) => `/invoices/${id}/pdf`,
        REMINDERS: (id: string) => `/invoices/${id}/reminders`,
        DRAFT_REMINDERS: '/invoices/draft-reminders',
        EXTRACT_BILLABLE_ITEMS: (id: string) => `/projects/${id}/extract-billable-items`,
    },

    // ==================== CLIENTS ====================
    CLIENTS: {
        LIST: '/clients/list',
        CREATE: '/clients/create',
        DETAIL: (id: string) => `/clients/${id}`,
        UPDATE: (id: string) => `/clients/${id}`,
        DELETE: (id: string) => `/clients/${id}`,
        CHECK_DUPLICATE: '/clients/check-duplicate',
    },

    // ==================== PROJECTS ====================
    PROJECTS: {
        LIST: '/projects/list',
        CREATE: '/projects/create',
        DETAIL: (id: string) => `/projects/${id}`,
        UPDATE: (id: string) => `/projects/${id}`,
        DELETE: (id: string) => `/projects/${id}`,
        MILESTONES: (id: string) => `/projects/${id}/milestones`,
    },

    // ==================== MILESTONES ====================
    MILESTONES: {
        DETAIL: (id: string) => `/milestones/${id}`,
        UPDATE: (id: string) => `/milestones/${id}`,
        MANUAL_ACTION: (id: string) => `/milestones/${id}/manual-action`,
    },

    // ==================== REMINDERS ====================
    REMINDERS: {
        QUEUE: '/reminders/queue',
        SEND: '/reminders/send',
        CALENDAR: '/reminders/calendar',
        TIMELINE: (invoiceId: string) => `/reminders/timeline/${invoiceId}`,
    },

    // ==================== AUTOMATION ====================
    AUTOMATION: {
        LIST: '/integrations/automations',
        NOTION: {
            CONNECT: '/integrations/notion/connect',
            IMPORT_NOTES: '/integrations/notion/import/notes',
            IMPORT_DATABASE: '/integrations/notion/import/database',
        },
        SLACK: {
            CONNECT: '/integrations/slack/connect',
            SEND: '/integrations/slack/send',
        },
    },

    // ==================== SETTINGS ====================
    SETTINGS: {
        WORKSPACE: '/workspace/settings',
        EMAIL_TEMPLATES: '/settings/email-templates',
        WHATSAPP_TEMPLATES: '/settings/whatsapp-templates',
        SAVED_ITEMS: '/settings/saved-items',
        INTEGRATIONS: '/settings/integrations',
    },

    // ==================== AI ====================
    AI: {
        REVIEW: '/ai-review',
        EXTRACT: '/ai-extract',
    },

    // ==================== INTERNAL (CRON) ====================
    INTERNAL: {
        REMINDERS_RUN: '/internal/reminders/run',
        SCHEDULED_INVOICES_RUN: '/internal/scheduled-invoices/run',
    },
} as const;
