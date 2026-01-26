/**
 * API Validation Schemas
 * ======================
 * Comprehensive Zod schemas for all API endpoints.
 * Every POST/PATCH request MUST validate input through these schemas.
 */

import { z } from "zod";
import { securityConfig } from "./security/security.config";
import { sanitizeInput, escapeHtml } from "./validation/integration-schemas";

// ================================================================
// COMMON VALIDATORS
// ================================================================

const cuidSchema = z.string().cuid();
const emailSchema = z.string().email("Invalid email format").max(255);
const phoneSchema = z.string().regex(/^[\d\s+\-().ext]+$/, "Invalid phone format").max(30).optional();
const urlSchema = z.string().url().max(2000).optional();

// Sanitized string - HTML escaped
const sanitizedString = (maxLength: number = 255) =>
    z.string()
        .max(maxLength)
        .transform((val) => sanitizeInput(val));

// Rich text with HTML escaping
const richTextString = (maxLength: number = 5000) =>
    z.string()
        .max(maxLength)
        .transform((val) => escapeHtml(val));

// Currency amount (2 decimal precision)
const currencyAmount = z.number()
    .min(0)
    .max(999999999.99)
    .transform((val) => Math.round(val * 100) / 100);

// Percentage (0-100)
const percentageSchema = z.number().min(0).max(100);

// ================================================================
// AUTH SCHEMAS
// ================================================================

export const signupSchema = z.object({
    name: sanitizedString(100),
    email: emailSchema,
    password: z.string()
        .min(securityConfig.validation.minPasswordLength, "Password too short")
        .max(securityConfig.validation.maxPasswordLength)
        .regex(/[a-z]/, "Password must contain lowercase letter")
        .regex(/[A-Z]/, "Password must contain uppercase letter")
        .regex(/[0-9]/, "Password must contain a number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(128),
});

export const passwordResetRequestSchema = z.object({
    email: emailSchema,
});

export const passwordResetSchema = z.object({
    token: z.string().min(32).max(128),
    password: signupSchema.shape.password,
});

export const verifyEmailSchema = z.object({
    token: z.string().min(32).max(128),
});

// ================================================================
// CLIENT SCHEMAS
// ================================================================

export const clientCreateSchema = z.object({
    name: sanitizedString(255),
    email: emailSchema.optional(),
    phone: phoneSchema,
    company: sanitizedString(255).optional(),
    contactPerson: sanitizedString(255).optional(),
    addressLine1: sanitizedString(255).optional(),
    addressLine2: sanitizedString(255).optional(),
    city: sanitizedString(100).optional(),
    state: sanitizedString(100).optional(),
    postalCode: sanitizedString(20).optional(),
    country: sanitizedString(100).optional(),
    taxId: sanitizedString(50).optional(),
    notes: richTextString(securityConfig.validation.maxClientNotesLength).optional(),
    paymentTerms: z.union([
        z.string().max(50),
        z.number().int().min(0).max(365).transform(n => String(n))
    ]).optional(),
    reminderChannel: z.enum(["email", "whatsapp", "both"]).optional(),
    tonePreference: z.enum(["professional", "friendly", "formal"]).optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// ================================================================
// PROJECT SCHEMAS
// ================================================================

export const projectCreateSchema = z.object({
    name: sanitizedString(255),
    clientId: cuidSchema,
    description: richTextString(securityConfig.validation.maxProjectDescriptionLength).optional(),
    status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    budget: currencyAmount.optional(),
    hourlyRate: currencyAmount.optional(),
});

export const projectUpdateSchema = projectCreateSchema.omit({ clientId: true }).partial();

export const milestoneCreateSchema = z.object({
    title: sanitizedString(255),
    description: richTextString(1000).optional(),
    amount: currencyAmount,
    dueDate: z.string().datetime().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BILLED"]).optional(),
});

// ================================================================
// INVOICE SCHEMAS
// ================================================================

const invoiceItemSchema = z.object({
    title: sanitizedString(securityConfig.validation.maxItemTitleLength),
    description: richTextString(1000).optional(),
    quantity: z.number().min(0.01).max(999999),
    rate: currencyAmount,
    unit: sanitizedString(50).optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const invoiceSaveSchema = z.object({
    // Client
    clientId: cuidSchema.optional(),
    newClientName: sanitizedString(255).optional(),
    newClientEmail: emailSchema.optional(),

    // Invoice details
    invoiceNumber: sanitizedString(50).optional(),
    issueDate: z.string().datetime().optional(),
    dueDate: z.string().datetime().optional(),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "scheduled"]).optional(),

    // Items
    items: z.array(invoiceItemSchema)
        .max(securityConfig.validation.maxInvoiceItems)
        .optional(),

    // Amounts
    subtotal: currencyAmount.optional(),
    taxRate: percentageSchema.optional(),
    taxAmount: currencyAmount.optional(),
    discount: currencyAmount.optional(),
    total: currencyAmount.optional(),

    // Additional info
    notes: richTextString(securityConfig.validation.maxNotesLength).optional(),
    terms: richTextString(securityConfig.validation.maxTermsLength).optional(),
    currency: z.string().length(3).optional(),

    // Template
    templateId: cuidSchema.optional(),
    branding: z.object({
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        fontFamily: sanitizedString(100).optional(),
        logoUrl: urlSchema,
    }).optional(),
});

export const invoiceSendSchema = z.object({
    invoiceId: cuidSchema,
    to: emailSchema,
    cc: z.array(emailSchema).max(5).optional(),
    subject: sanitizedString(200),
    body: richTextString(5000),
    attachPdf: z.boolean().optional(),
});

export const invoiceScheduleSchema = z.object({
    invoiceId: cuidSchema,
    scheduledAt: z.string().datetime()
        .refine((date) => {
            const scheduleDate = new Date(date);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + securityConfig.validation.maxScheduleDaysFuture);
            return scheduleDate <= maxDate;
        }, "Cannot schedule more than 90 days in advance"),
});

// ================================================================
// REMINDER SCHEMAS
// ================================================================

const reminderStepSchema = z.object({
    daysOffset: z.number().int()
        .min(securityConfig.validation.minReminderDaysOffset)
        .max(securityConfig.validation.maxReminderDaysOffset),
    channel: z.enum(["email", "whatsapp"]),
    templateId: cuidSchema.optional(),
    customSubject: sanitizedString(200).optional(),
    customBody: richTextString(2000).optional(),
});

export const reminderScheduleCreateSchema = z.object({
    invoiceId: cuidSchema,
    enabled: z.boolean().optional(),
    steps: z.array(reminderStepSchema)
        .max(securityConfig.validation.maxReminderSteps),
});

// ================================================================
// WORKSPACE SCHEMAS
// ================================================================

export const workspaceCreateSchema = z.object({
    name: sanitizedString(100),
    slug: z.string()
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
        .min(3)
        .max(50),
});

export const workspaceUpdateSchema = z.object({
    name: sanitizedString(100).optional(),
    businessName: sanitizedString(255).optional(),
    taxGstNumber: sanitizedString(50).optional(),
    pan: sanitizedString(20).optional(),
    addressLine1: sanitizedString(255).optional(),
    addressLine2: sanitizedString(255).optional(),
    city: sanitizedString(100).optional(),
    state: sanitizedString(100).optional(),
    postalCode: sanitizedString(20).optional(),
    country: sanitizedString(100).optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
});

export const workspaceInviteSchema = z.object({
    email: emailSchema,
    role: z.enum(["admin", "member"]),
});

export const workspaceDeleteSchema = z.object({
    confirmName: z.string()
        .refine((val) => val.length > 0, "Workspace name required for confirmation"),
});

// ================================================================
// EMAIL TEMPLATE SCHEMAS
// ================================================================

export const emailTemplateCreateSchema = z.object({
    name: sanitizedString(100),
    subject: sanitizedString(200),
    body: richTextString(10000),
    type: z.enum(["invoice_send", "reminder", "followup", "payment_confirmation"]),
    isDefault: z.boolean().optional(),
});

export const emailTemplateUpdateSchema = emailTemplateCreateSchema.partial();

export const sendTestEmailSchema = z.object({
    templateId: cuidSchema,
    testEmail: emailSchema,
});

// ================================================================
// SAVED ITEM SCHEMAS
// ================================================================

export const savedItemCreateSchema = z.object({
    type: z.enum(["ITEM", "TEMPLATE", "CLAUSE"]),
    title: sanitizedString(255),
    description: richTextString(1000).optional(),
    content: z.record(z.string(), z.unknown()).optional(), // JSON content, validated separately
    rate: currencyAmount.optional(),
    unit: sanitizedString(50).optional(),
});

// ================================================================
// PROFILE SCHEMAS
// ================================================================

export const profileUpdateSchema = z.object({
    name: sanitizedString(100).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema,
    timezone: z.string().max(100).optional(),
    locale: z.string().max(10).optional(),
    avatar: urlSchema,
});

// ================================================================
// EXPORT ALL SCHEMAS
// ================================================================

export const apiSchemas = {
    // Auth
    signup: signupSchema,
    login: loginSchema,
    passwordResetRequest: passwordResetRequestSchema,
    passwordReset: passwordResetSchema,
    verifyEmail: verifyEmailSchema,

    // Client
    clientCreate: clientCreateSchema,
    clientUpdate: clientUpdateSchema,

    // Project
    projectCreate: projectCreateSchema,
    projectUpdate: projectUpdateSchema,
    milestoneCreate: milestoneCreateSchema,

    // Invoice
    invoiceSave: invoiceSaveSchema,
    invoiceSend: invoiceSendSchema,
    invoiceSchedule: invoiceScheduleSchema,

    // Reminder
    reminderScheduleCreate: reminderScheduleCreateSchema,

    // Workspace
    workspaceCreate: workspaceCreateSchema,
    workspaceUpdate: workspaceUpdateSchema,
    workspaceInvite: workspaceInviteSchema,
    workspaceDelete: workspaceDeleteSchema,

    // Email Template
    emailTemplateCreate: emailTemplateCreateSchema,
    emailTemplateUpdate: emailTemplateUpdateSchema,
    sendTestEmail: sendTestEmailSchema,

    // Saved Item
    savedItemCreate: savedItemCreateSchema,

    // Profile
    profileUpdate: profileUpdateSchema,
} as const;
