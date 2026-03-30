/**
 * Audit Logging Utility
 * =====================
 * Records security-sensitive actions for compliance and incident response.
 */

import { prisma } from '@/lib/prisma';
import { securityConfig, AuditAction } from './security.config';
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
    userId?: string;  // Optional for anonymous events (failed login, signup attempt)
    action: AuditAction;
    workspaceId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
}

/**
 * Extract client info from request for audit logging
 */
export function getClientInfo(request: NextRequest) {
    return {
        ipAddress:
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        requestId: request.headers.get(securityConfig.headers.requestIdHeader) || undefined,
    };
}

/**
 * Log a security-sensitive action
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        // Log to console for debugging
        const logEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
            action: securityConfig.auditActions[entry.action] || entry.action,
        };

        console.log('[AUDIT]', JSON.stringify(logEntry));

        // Store in database
        await prisma.auditLog.create({
            data: {
                userId: entry.userId || "anonymous",  // Fallback for anonymous events
                workspaceId: entry.workspaceId,
                action: entry.action,
                resourceType: entry.resourceType,
                resourceId: entry.resourceId,
                metadata: entry.metadata as object,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                requestId: entry.requestId,
            },
        });
    } catch (error) {
        // Never let audit logging break the main flow
        console.error('[AUDIT ERROR]', error);
    }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'SIGNUP' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'EMAIL_VERIFIED',
    userId: string,
    request: NextRequest,
    metadata?: Record<string, unknown>
) {
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
        userId,
        action,
        metadata,
        ...clientInfo,
    });
}

/**
 * Log workspace events
 */
export async function logWorkspaceEvent(
    action: 'WORKSPACE_CREATED' | 'WORKSPACE_UPDATED' | 'WORKSPACE_DELETED' | 'WORKSPACE_EXPORTED',
    userId: string,
    workspaceId: string,
    request: NextRequest,
    metadata?: Record<string, unknown>
) {
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
        userId,
        action,
        workspaceId,
        resourceType: 'WORKSPACE',
        resourceId: workspaceId,
        metadata,
        ...clientInfo,
    });
}

/**
 * Log member events
 */
export async function logMemberEvent(
    action: 'MEMBER_INVITED' | 'MEMBER_REMOVED' | 'MEMBER_ROLE_CHANGED' | 'INVITE_ACCEPTED',
    userId: string,
    workspaceId: string,
    targetUserId: string,
    request: NextRequest,
    metadata?: Record<string, unknown>
) {
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
        userId,
        action,
        workspaceId,
        resourceType: 'MEMBER',
        resourceId: targetUserId,
        metadata,
        ...clientInfo,
    });
}

/**
 * Log invoice events
 */
export async function logInvoiceEvent(
    action: 'INVOICE_CREATED' | 'INVOICE_UPDATED' | 'INVOICE_SENT' | 'INVOICE_DELETED' | 'PDF_GENERATED' | 'INVOICE_SCHEDULED',
    userId: string,
    workspaceId: string,
    invoiceId: string,
    request: NextRequest,
    metadata?: Record<string, unknown>
) {
    const clientInfo = getClientInfo(request);
    await logAuditEvent({
        userId,
        action,
        workspaceId,
        resourceType: 'INVOICE',
        resourceId: invoiceId,
        metadata,
        ...clientInfo,
    });
}

/**
 * Log cron/internal events
 */
export async function logCronEvent(
    action: 'CRON_EXECUTED' | 'CRON_FAILED',
    cronName: string,
    metadata?: Record<string, unknown>
) {
    await logAuditEvent({
        userId: 'SYSTEM',
        action,
        resourceType: 'CRON',
        resourceId: cronName,
        metadata,
    });
}
