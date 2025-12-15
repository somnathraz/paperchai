/**
 * Secure Route Wrapper
 * ====================
 * DRY wrapper that applies all security controls to API routes.
 * 
 * Usage:
 * ```typescript
 * import { secureRoute } from '@/lib/security/secure-route';
 * 
 * export const POST = secureRoute({
 *   rateLimit: 'emailSend',
 *   requiredPermission: 'canSendInvoices',
 *   audit: 'INVOICE_SENT',
 * }, async (req, ctx) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { securityConfig, RateLimitProfile, AuditAction, Role } from './security.config';
import { getWorkspaceContext, AuthError, authErrorResponse, WorkspaceContext } from './workspace-auth';
import { logAuditEvent, getClientInfo } from './audit-log';
import { checkRateLimitByProfile } from './rate-limit-enhanced';

export interface SecureRouteOptions<TBody = unknown> {
    // Rate limiting
    rateLimit?: RateLimitProfile;

    // Authentication & Authorization
    public?: boolean; // Skip auth entirely
    requireSession?: boolean; // Require session but not workspace
    requiredPermission?: keyof typeof securityConfig.workspaceRoles;

    // Validation
    bodySchema?: ZodSchema<TBody>;
    querySchema?: ZodSchema;

    // Audit logging
    audit?: AuditAction;

    // Request options
    maxBodySize?: number;
}

export interface SecureRouteContext<TBody = unknown> extends Partial<WorkspaceContext> {
    body?: TBody;
    query?: Record<string, string>;
    requestId: string;
}

type RouteHandler<TBody = unknown> = (
    req: NextRequest,
    ctx: SecureRouteContext<TBody>
) => Promise<NextResponse>;

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a secure route wrapper
 */
export function secureRoute<TBody = unknown>(
    options: SecureRouteOptions<TBody>,
    handler: RouteHandler<TBody>
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        const requestId = req.headers.get(securityConfig.headers.requestIdHeader) || generateRequestId();
        const clientInfo = getClientInfo(req);

        try {
            // 1. Rate Limiting
            if (options.rateLimit) {
                const rateLimitResult = await checkRateLimitByProfile(
                    req,
                    options.rateLimit,
                    undefined // User ID will be added after auth
                );

                if (!rateLimitResult.allowed) {
                    return NextResponse.json(
                        { error: rateLimitResult.error || 'Rate limit exceeded' },
                        {
                            status: 429,
                            headers: {
                                [securityConfig.headers.rateLimitHeaders.limit]: String(rateLimitResult.limit),
                                [securityConfig.headers.rateLimitHeaders.remaining]: String(rateLimitResult.remaining),
                                [securityConfig.headers.rateLimitHeaders.reset]: String(rateLimitResult.resetAt),
                            },
                        }
                    );
                }
            }

            // 2. Authentication & Authorization
            let workspaceContext: WorkspaceContext | undefined;

            if (!options.public) {
                try {
                    workspaceContext = await getWorkspaceContext(options.requiredPermission);
                } catch (error) {
                    if (error instanceof AuthError) {
                        return authErrorResponse(error);
                    }
                    throw error;
                }
            }

            // 3. Body Validation
            let body: TBody | undefined;
            if (options.bodySchema && req.method !== 'GET') {
                try {
                    const rawBody = await req.json();
                    body = options.bodySchema.parse(rawBody);
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return NextResponse.json(
                            { error: 'Validation error', details: error.issues },
                            { status: 400 }
                        );
                    }
                    return NextResponse.json(
                        { error: 'Invalid request body' },
                        { status: 400 }
                    );
                }
            }

            // 4. Query Validation
            let query: Record<string, string> | undefined;
            if (options.querySchema) {
                try {
                    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
                    query = options.querySchema.parse(searchParams) as Record<string, string>;
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return NextResponse.json(
                            { error: 'Invalid query parameters', details: error.issues },
                            { status: 400 }
                        );
                    }
                    return NextResponse.json(
                        { error: 'Invalid query parameters' },
                        { status: 400 }
                    );
                }
            }

            // 5. Build context
            const ctx: SecureRouteContext<TBody> = {
                ...workspaceContext,
                body,
                query,
                requestId,
            };

            // 6. Execute handler
            const response = await handler(req, ctx);

            // 7. Audit logging (on success)
            if (options.audit && workspaceContext) {
                await logAuditEvent({
                    userId: workspaceContext.session.user.id,
                    action: options.audit,
                    workspaceId: workspaceContext.workspace.id,
                    ...clientInfo,
                    requestId,
                });
            }

            // 8. Add request ID header to response
            response.headers.set(securityConfig.headers.requestIdHeader, requestId);

            return response;
        } catch (error) {
            // Log error
            console.error(`[${requestId}] Route error:`, error);

            // Handle known errors
            if (error instanceof AuthError) {
                return authErrorResponse(error);
            }

            // Generic error response
            return NextResponse.json(
                { error: 'Internal server error', requestId },
                { status: 500 }
            );
        }
    };
}

/**
 * Create a public route wrapper (no auth required)
 */
export function publicRoute<TBody = unknown>(
    options: Omit<SecureRouteOptions<TBody>, 'public' | 'requiredPermission'>,
    handler: RouteHandler<TBody>
) {
    return secureRoute({ ...options, public: true }, handler);
}

/**
 * Create an internal/cron route wrapper (requires CRON_SECRET)
 */
export function cronRoute(
    handler: (req: NextRequest, ctx: { requestId: string }) => Promise<NextResponse>
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        const requestId = generateRequestId();

        // Check CRON_SECRET
        const authHeader = req.headers.get('authorization');
        const cronHeader = req.headers.get(securityConfig.cron.secretHeader);
        const expectedSecret = process.env.CRON_SECRET;

        if (!expectedSecret) {
            console.error('[CRON] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const providedSecret = cronHeader || (authHeader?.startsWith('Bearer ') && authHeader.slice(7));

        if (providedSecret !== expectedSecret) {
            console.warn(`[CRON] Unauthorized cron attempt from ${getClientInfo(req).ipAddress}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            return await handler(req, { requestId });
        } catch (error) {
            console.error(`[${requestId}] Cron error:`, error);
            return NextResponse.json(
                { error: 'Internal server error', requestId },
                { status: 500 }
            );
        }
    };
}
