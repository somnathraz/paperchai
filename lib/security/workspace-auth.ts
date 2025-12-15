/**
 * Workspace Authentication Helpers
 * =================================
 * Centralized auth and role checking for workspace-scoped endpoints.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { securityConfig, WorkspaceRole } from './security.config';

export interface SessionUser {
    id: string;
    email: string;
    name?: string | null;
    activeWorkspaceId?: string | null;
}

export interface WorkspaceContext {
    session: { user: SessionUser };
    workspace: {
        id: string;
        name: string;
        ownerId: string;
    };
    membership: {
        id: string;
        role: WorkspaceRole;
    };
    isOwner: boolean;
}

/**
 * Get current session or throw 401
 */
export async function requireSession(): Promise<{ user: SessionUser }> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        throw new AuthError('Unauthorized', 401);
    }

    // Get user ID from database
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true, activeWorkspaceId: true },
    });

    if (!user) {
        throw new AuthError('User not found', 401);
    }

    return { user };
}

/**
 * Get workspace context with role verification
 */
export async function requireWorkspaceAccess(
    userId: string,
    workspaceId?: string
): Promise<WorkspaceContext['workspace'] & { membership: WorkspaceContext['membership']; isOwner: boolean }> {
    // If no workspaceId provided, try to get user's active workspace
    let targetWorkspaceId = workspaceId;

    if (!targetWorkspaceId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeWorkspaceId: true },
        });
        targetWorkspaceId = user?.activeWorkspaceId || undefined;
    }

    if (!targetWorkspaceId) {
        throw new AuthError('No workspace selected', 400);
    }

    // Get workspace with membership
    const workspace = await prisma.workspace.findUnique({
        where: { id: targetWorkspaceId },
        select: {
            id: true,
            name: true,
            ownerId: true,
            members: {
                where: { userId },
                select: { id: true, role: true },
            },
        },
    });

    if (!workspace) {
        throw new AuthError('Workspace not found', 404);
    }

    const membership = workspace.members[0];

    if (!membership) {
        throw new AuthError('Not a member of this workspace', 403);
    }

    return {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        membership: {
            id: membership.id,
            role: membership.role as WorkspaceRole,
        },
        isOwner: workspace.ownerId === userId,
    };
}

/**
 * Verify user has required role
 */
export function requireRole(
    userRole: WorkspaceRole,
    requiredRoles: readonly WorkspaceRole[]
): void {
    if (!requiredRoles.includes(userRole)) {
        throw new AuthError(
            `Insufficient permissions. Required: ${requiredRoles.join(' or ')}`,
            403
        );
    }
}

/**
 * Check if user can perform action based on permission
 */
export function hasPermission(
    userRole: WorkspaceRole,
    permission: keyof typeof securityConfig.workspaceRoles
): boolean {
    const allowedRoles = securityConfig.workspaceRoles[permission];
    if (!Array.isArray(allowedRoles)) return false;
    return (allowedRoles as readonly string[]).includes(userRole);
}

/**
 * Full workspace auth check - returns context or throws error
 */
export async function getWorkspaceContext(
    requiredPermission?: keyof typeof securityConfig.workspaceRoles,
    workspaceId?: string
): Promise<WorkspaceContext> {
    const { user } = await requireSession();
    const workspaceData = await requireWorkspaceAccess(user.id, workspaceId);

    if (requiredPermission) {
        const allowedRoles = securityConfig.workspaceRoles[requiredPermission] as readonly WorkspaceRole[];
        requireRole(workspaceData.membership.role, allowedRoles);
    }

    return {
        session: { user },
        workspace: {
            id: workspaceData.id,
            name: workspaceData.name,
            ownerId: workspaceData.ownerId,
        },
        membership: workspaceData.membership,
        isOwner: workspaceData.isOwner,
    };
}

/**
 * Custom error class for auth errors
 */
export class AuthError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 401) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
    }
}

/**
 * Convert AuthError to NextResponse
 */
export function authErrorResponse(error: unknown): NextResponse {
    if (error instanceof AuthError) {
        return NextResponse.json(
            { error: error.message },
            { status: error.statusCode }
        );
    }

    console.error('[Auth Error]', error);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}

/**
 * Check if there's exactly one owner (for owner removal protection)
 */
export async function isOnlyOwner(workspaceId: string, userId: string): Promise<boolean> {
    const owners = await prisma.workspaceMember.count({
        where: {
            workspaceId,
            role: 'owner',
        },
    });

    const isUserOwner = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId,
            role: 'owner',
        },
    });

    return owners === 1 && !!isUserOwner;
}
