import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Admin-only endpoint
        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');
        const workspaceId = searchParams.get('workspaceId');
        const resourceType = searchParams.get('resourceType');

        const skip = (page - 1) * limit;

        // Build filter
        const where: any = {};
        if (action) where.action = action;
        if (userId) where.userId = userId;
        if (workspaceId) where.workspaceId = workspaceId;
        if (resourceType) where.resourceType = resourceType;

        // Fetch logs
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.auditLog.count({ where }),
        ]);

        // Get unique actions for filter
        const uniqueActions = await prisma.auditLog.findMany({
            where: {},
            select: { action: true },
            distinct: ['action'],
            orderBy: { action: 'asc' },
        });

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            filters: {
                actions: uniqueActions.map(a => a.action),
            },
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
