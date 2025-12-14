/**
 * Input Validation & Sanitization
 * 
 * Zod schemas for all integration endpoints
 * Sanitization utilities to prevent XSS and SQL injection
 */

import { z } from "zod";

// ===== Slack Validation Schemas =====

export const slackOAuthCallbackSchema = z.object({
    code: z.string().min(1).max(500),
    state: z.string().min(1).max(500).optional(),
    error: z.string().optional()
});

export const slackCommandSchema = z.object({
    team_id: z.string().regex(/^T[A-Z0-9]+$/),
    team_domain: z.string().optional(),
    channel_id: z.string().regex(/^C[A-Z0-9]+$/),
    channel_name: z.string().optional(),
    user_id: z.string().regex(/^U[A-Z0-9]+$/),
    user_name: z.string().optional(),
    command: z.string().startsWith("/"),
    text: z.string().max(3000),
    response_url: z.string().url(),
    trigger_id: z.string().optional()
});

export const slackEventSchema = z.object({
    token: z.string(),
    team_id: z.string(),
    api_app_id: z.string(),
    event: z.object({
        type: z.string(),
        channel: z.string().optional(),
        user: z.string().optional(),
        text: z.string().optional(),
        ts: z.string().optional(),
        thread_ts: z.string().optional()
    }),
    type: z.enum(["url_verification", "event_callback"]),
    challenge: z.string().optional()
});

export const slackImportSchema = z.object({
    channelId: z.string().regex(/^C[A-Z0-9]+$/, "Invalid Slack channel ID"),
    threadTs: z.string().regex(/^\d+\.\d+$/, "Invalid thread timestamp").optional(),
    importType: z.enum(["THREAD_SUMMARY", "SLASH_COMMAND", "MESSAGE_REACTION"])
});

// ===== Notion Validation Schemas =====

export const notionOAuthCallbackSchema = z.object({
    code: z.string().min(1).max(500),
    state: z.string().min(1).max(500).optional(),
    error: z.string().optional()
});

export const notionImportSchema = z.object({
    databaseId: z.string().regex(/^[a-f0-9]{32}$/, "Invalid Notion database ID"),
    importType: z.enum(["PROJECT", "CLIENT", "TASK", "INVOICE_DATA"])
});

export const notionWebhookSchema = z.object({
    object: z.literal("event"),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    type: z.enum(["page", "database"]),
    page: z.object({
        id: z.string()
    }).optional(),
    database: z.object({
        id: z.string()
    }).optional()
});

// ===== Sanitization Utilities =====

/**
 * Sanitize string input to prevent XSS and SQL injection
 */
export function sanitizeInput(input: string): string {
    if (!input) return "";

    return input
        // Remove <script> tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove all HTML tags
        .replace(/<[^>]+>/g, "")
        // Remove potentially dangerous SQL characters
        .replace(/['"`;\\]/g, "")
        // Remove null bytes
        .replace(/\0/g, "")
        // Trim whitespace
        .trim();
}

/**
 * Sanitize JSON object recursively
 */
export function sanitizeJson(input: any): any {
    if (input === null || input === undefined) {
        return input;
    }

    if (typeof input === "string") {
        return sanitizeInput(input);
    }

    if (Array.isArray(input)) {
        return input.map(sanitizeJson);
    }

    if (typeof input === "object") {
        const sanitized: any = {};
        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                const sanitizedKey = sanitizeInput(key);
                sanitized[sanitizedKey] = sanitizeJson(input[key]);
            }
        }
        return sanitized;
    }

    return input;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Invalid protocol");
        }
        return parsed.toString();
    } catch {
        return "";
    }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize filename (prevent directory traversal)
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.{2,}/g, ".")
        .substring(0, 255);
}
