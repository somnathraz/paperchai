/**
 * Security Configuration
 * =====================
 * Centralized configuration for ALL security settings.
 * Modify values here to adjust security behavior across the entire application.
 */

export const securityConfig = {
    // ============================================
    // RATE LIMITING
    // ============================================
    rateLimits: {
        // Authentication endpoints (strict)
        auth: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
        signup: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour per IP
        passwordReset: { limit: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day per email

        // Email sending (prevent spam)
        emailSend: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour per workspace
        testEmail: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 test emails per hour

        // Resource-intensive operations
        pdfGenerate: { limit: 5, windowMs: 60 * 1000 }, // 5 PDFs per minute per user
        aiExtract: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 AI calls per hour per user
        aiGenerate: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 AI generations per hour

        // Integration imports
        integrationImport: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 imports per hour

        // General API
        general: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
        list: { limit: 120, windowMs: 60 * 1000 }, // 120 list requests per minute

        // Invoice operations
        invoiceCreate: { limit: 60, windowMs: 60 * 60 * 1000 }, // 60 per hour
        invoiceSchedule: { limit: 50, windowMs: 24 * 60 * 60 * 1000 }, // 50 scheduled per day

        // Client/Project creation
        clientCreate: { limit: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100 per day per workspace
        projectCreate: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 per hour

        // Workspace operations
        workspaceCreate: { limit: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 per day per user
        workspaceExport: { limit: 2, windowMs: 24 * 60 * 60 * 1000 }, // 2 exports per day
    },

    // ============================================
    // EMAIL COOLDOWNS (prevent spam/bombing)
    // ============================================
    emailCooldowns: {
        invoiceSend: 30 * 60 * 1000, // 30 min between sends per invoice
        testEmail: 5 * 60 * 1000, // 5 min between test emails per user
        verificationEmail: 60 * 1000, // 1 min between verification emails
        reminderEmail: 60 * 60 * 1000, // 1 hour between reminder emails per invoice
    },

    // ============================================
    // TOKEN EXPIRY
    // ============================================
    tokenExpiry: {
        verificationEmail: 30 * 60 * 1000, // 30 minutes
        passwordReset: 60 * 60 * 1000, // 1 hour
        workspaceInvite: 7 * 24 * 60 * 60 * 1000, // 7 days
        csrfToken: 24 * 60 * 60 * 1000, // 24 hours
    },

    // ============================================
    // VALIDATION LIMITS
    // ============================================
    validation: {
        // Invoice limits
        maxInvoiceItems: 50,
        maxItemTitleLength: 255,
        maxNotesLength: 5000,
        maxTermsLength: 5000,

        // Project limits
        maxMilestones: 20,
        maxProjectDescriptionLength: 10000,

        // Reminder limits
        maxReminderSteps: 10,
        maxReminderDaysOffset: 365,
        minReminderDaysOffset: -30,

        // Schedule limits
        maxScheduledInvoices: 50,
        maxScheduleDaysFuture: 90,

        // Client limits
        maxDraftClients: 20,
        maxClientNotesLength: 5000,

        // Password requirements
        minPasswordLength: 8,
        maxPasswordLength: 128,

        // Search/input limits
        maxSearchLength: 64,
        maxPromptLength: 2000,
        maxEmailLength: 320,
        maxNameLength: 255,
        maxPhoneLength: 20,

        // Pagination
        maxPageSize: 100,
        defaultPageSize: 20,

        // Request body size (in bytes)
        maxBodySize: 1024 * 1024, // 1MB
    },

    // ============================================
    // WORKSPACE LIMITS
    // ============================================
    workspaceLimits: {
        maxPerUser: 5,
        maxMembersPerWorkspace: 50,
        maxInvitesPerDay: 20,
        maxClientsPerWorkspace: 500,
        maxProjectsPerWorkspace: 200,
        maxExportsPerDay: 2,
        deleteGracePeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days soft delete
    },

    // ============================================
    // SUBSCRIPTION TIERS & LIMITS
    // ============================================
    tiers: {
        // Available subscription tiers
        all: ['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'] as const,

        // Tier-specific limits
        limits: {
            FREE: {
                workspaces: 1,
                invoicesPerMonth: 10,
                clients: 5,
                projects: 3,
                aiCallsPerMonth: 5,
                pdfGenerationsPerMonth: 20,
                emailsPerMonth: 50,
                teamMembers: 1,
                integrations: false,
                customBranding: false,
                apiAccess: false,
            },
            STARTER: {
                workspaces: 2,
                invoicesPerMonth: 50,
                clients: 25,
                projects: 10,
                aiCallsPerMonth: 50,
                pdfGenerationsPerMonth: 100,
                emailsPerMonth: 200,
                teamMembers: 3,
                integrations: true,
                customBranding: false,
                apiAccess: false,
            },
            PROFESSIONAL: {
                workspaces: 5,
                invoicesPerMonth: 200,
                clients: 100,
                projects: 50,
                aiCallsPerMonth: 200,
                pdfGenerationsPerMonth: 500,
                emailsPerMonth: 1000,
                teamMembers: 10,
                integrations: true,
                customBranding: true,
                apiAccess: true,
            },
            BUSINESS: {
                workspaces: 10,
                invoicesPerMonth: 1000,
                clients: 500,
                projects: 200,
                aiCallsPerMonth: 1000,
                pdfGenerationsPerMonth: 2000,
                emailsPerMonth: 5000,
                teamMembers: 25,
                integrations: true,
                customBranding: true,
                apiAccess: true,
            },
            ENTERPRISE: {
                workspaces: -1, // Unlimited
                invoicesPerMonth: -1, // Unlimited
                clients: -1, // Unlimited
                projects: -1, // Unlimited
                aiCallsPerMonth: -1, // Unlimited
                pdfGenerationsPerMonth: -1, // Unlimited
                emailsPerMonth: -1, // Unlimited
                teamMembers: -1, // Unlimited
                integrations: true,
                customBranding: true,
                apiAccess: true,
            },
        },
    },

    // ============================================
    // WORKSPACE ROLES (within a workspace)
    // ============================================
    workspaceRoles: {
        // Available roles within a workspace
        all: ['owner', 'admin'] as const,

        // Role-based permissions
        canManageMembers: ['owner'] as const,
        canDeleteWorkspace: ['owner'] as const,
        canInviteMembers: ['owner', 'admin'] as const,
        canExportWorkspace: ['owner', 'admin'] as const,
        canManageSettings: ['owner', 'admin'] as const,
        canEdit: ['owner', 'admin'] as const,
        canSendInvoices: ['owner', 'admin'] as const,
        canView: ['owner', 'admin'] as const,

        // Default role for new members
        defaultRole: 'admin' as const,
    },

    // ============================================
    // AUDIT LOG ACTIONS
    // ============================================
    auditActions: {
        // Authentication
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
        LOGIN_FAILED: 'LOGIN_FAILED',
        SIGNUP: 'SIGNUP',
        PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
        PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
        EMAIL_VERIFIED: 'EMAIL_VERIFIED',

        // User/Profile
        PROFILE_UPDATED: 'PROFILE_UPDATED',
        SETTINGS_UPDATED: 'SETTINGS_UPDATED',

        // Invoice
        INVOICE_CREATED: 'INVOICE_CREATED',
        INVOICE_UPDATED: 'INVOICE_UPDATED',
        INVOICE_SENT: 'INVOICE_SENT',
        INVOICE_DELETED: 'INVOICE_DELETED',
        PDF_GENERATED: 'PDF_GENERATED',
        INVOICE_SCHEDULED: 'INVOICE_SCHEDULED',

        // Client
        CLIENT_CREATED: 'CLIENT_CREATED',
        CLIENT_UPDATED: 'CLIENT_UPDATED',
        CLIENT_DELETED: 'CLIENT_DELETED',

        // Project
        PROJECT_CREATED: 'PROJECT_CREATED',
        PROJECT_UPDATED: 'PROJECT_UPDATED',
        PROJECT_DELETED: 'PROJECT_DELETED',

        // Workspace
        WORKSPACE_CREATED: 'WORKSPACE_CREATED',
        WORKSPACE_UPDATED: 'WORKSPACE_UPDATED',
        WORKSPACE_DELETED: 'WORKSPACE_DELETED',
        WORKSPACE_EXPORTED: 'WORKSPACE_EXPORTED',

        // Members
        MEMBER_INVITED: 'MEMBER_INVITED',
        MEMBER_REMOVED: 'MEMBER_REMOVED',
        MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
        INVITE_ACCEPTED: 'INVITE_ACCEPTED',

        // AI
        AI_EXTRACTION: 'AI_EXTRACTION',
        AI_GENERATION: 'AI_GENERATION',

        // Integrations
        INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED',
        INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',
        INTEGRATION_IMPORT: 'INTEGRATION_IMPORT',

        // Reminders
        REMINDER_SENT: 'REMINDER_SENT',
        REMINDER_SCHEDULE_CREATED: 'REMINDER_SCHEDULE_CREATED',
        REMINDER_SCHEDULE_UPDATED: 'REMINDER_SCHEDULE_UPDATED',

        // System/Cron
        CRON_EXECUTED: 'CRON_EXECUTED',
        CRON_FAILED: 'CRON_FAILED',
    },

    // ============================================
    // CRON/INTERNAL ENDPOINTS
    // ============================================
    cron: {
        // Header name for cron secret (also supports Authorization: Bearer)
        secretHeader: 'x-cron-secret',
        // Require authorization for internal endpoints
        requireAuth: true,
    },

    // ============================================
    // SECURITY HEADERS
    // ============================================
    headers: {
        requestIdHeader: 'x-request-id',
        rateLimitHeaders: {
            limit: 'x-ratelimit-limit',
            remaining: 'x-ratelimit-remaining',
            reset: 'x-ratelimit-reset',
        },
    },
} as const;

// Type exports for TypeScript
export type RateLimitProfile = keyof typeof securityConfig.rateLimits;
export type AuditAction = keyof typeof securityConfig.auditActions;
export type SubscriptionTier = (typeof securityConfig.tiers.all)[number];
export type WorkspaceRole = (typeof securityConfig.workspaceRoles.all)[number];
// Legacy export for backwards compatibility
export type Role = WorkspaceRole;
