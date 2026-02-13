/**
 * Integration Status Endpoint
 * GET /api/integrations/status
 *
 * Returns status of all integrations for current workspace
 * Enhanced to include autopilot stats for automation page
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTier, TIER_LIMITS } from "@/lib/tier-limits";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { subDays } from "date-fns";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get or create workspace using ensureActiveWorkspace
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      // Return default/empty status if workspace can't be initialized
      // This can happen on first login before workspace is fully set up
      console.log("[Integration Status] No workspace for user:", session.user.id);
      return NextResponse.json({
        success: true,
        tier: "free",
        integrationsEnabled: false,
        limits: { maxConnections: 0, importsPerDay: 0, importsPerMinute: 0 },
        usage: { connectionsUsed: 0, importsToday: 0 },
        canManageIntegrations: false,
        autopilot: {
          isConfigured: false,
          status: "OFF",
          invoicesCovered: 0,
          totalInvoices: 0,
          coveragePercent: 0,
          last30DaysCollected: 0,
          invoicesPaidLast30Days: 0,
          avgDaysFaster: 0,
        },
        integrations: {
          slack: { connected: false, status: "NOT_CONNECTED" },
          notion: { connected: false, status: "NOT_CONNECTED" },
        },
      });
    }
    const workspaceId = workspace.id;
    const canManageIntegrations = await isWorkspaceApprover(workspaceId, session.user.id);
    const tier = getUserTier(session.user.id, session.user.email);
    const tierLimits = TIER_LIMITS[tier];

    // 3. Get all connections for this workspace
    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId },
      select: {
        id: true,
        provider: true,
        status: true,
        providerWorkspaceName: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 4. Get import counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30Days = subDays(new Date(), 30);

    const [
      slackImportCountToday,
      notionImportCountToday,
      notionClientsImported,
      notionProjectsImported,
      distinctNotionDatabases, // Group by result (array of objects)
      slackThreadsProcessed,
    ] = await Promise.all([
      prisma.slackImport.count({
        where: {
          connection: { workspaceId },
          createdAt: { gte: today },
        },
      }),
      prisma.notionImport.count({
        where: {
          connection: { workspaceId },
          createdAt: { gte: today },
        },
      }),
      prisma.notionImport.count({
        where: {
          connection: { workspaceId },
          importType: "CLIENT",
          status: "COMPLETED",
        },
      }),
      prisma.notionImport.count({
        where: {
          connection: { workspaceId },
          importType: "PROJECT",
          status: "COMPLETED",
        },
      }),
      // Count unique Notion Database IDs that have at least 1 completed import
      prisma.notionImport.groupBy({
        by: ["notionDatabaseId"],
        where: {
          connection: { workspaceId },
          status: "COMPLETED",
        },
      }),
      prisma.slackImport.count({
        where: {
          connection: { workspaceId },
          status: "COMPLETED",
        },
      }),
    ]);

    const databasesMappedCount = distinctNotionDatabases.length;

    // 5. Get autopilot stats
    const [totalInvoices, invoicesWithReminders, paidLast30Days, avgPaymentDays] =
      await Promise.all([
        prisma.invoice.count({
          where: { workspaceId, status: { in: ["sent", "overdue", "paid"] } },
        }),
        prisma.invoice.count({
          where: { workspaceId, remindersEnabled: true },
        }),
        prisma.invoice.aggregate({
          where: {
            workspaceId,
            status: "paid",
            updatedAt: { gte: last30Days },
          },
          _sum: { total: true },
          _count: true,
        }),
        // Calculate average days to payment for invoices paid in last 30 days
        prisma.invoice.findMany({
          where: {
            workspaceId,
            status: "paid",
            updatedAt: { gte: last30Days },
          },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

    // Calculate average days faster (simplified)
    let avgDaysFaster = 0;
    if (avgPaymentDays.length > 0) {
      const totalDays = avgPaymentDays.reduce((sum, inv) => {
        const days = Math.ceil(
          (inv.updatedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgDaysFaster = Math.max(0, 30 - totalDays / avgPaymentDays.length); // Compared to 30 day baseline
    }

    // 6. Build response
    const slack = connections.find((c) => c.provider === "SLACK");
    const notion = connections.find((c) => c.provider === "NOTION");
    const isConfigured =
      !!(slack?.status === "CONNECTED" || notion?.status === "CONNECTED") ||
      invoicesWithReminders > 0;

    return NextResponse.json({
      success: true,
      tier,
      integrationsEnabled: tierLimits.integrations.enabled,
      limits: {
        maxConnections: tierLimits.integrations.maxConnections,
        importsPerDay: tierLimits.integrations.importsPerDay,
        importsPerMinute: tierLimits.integrations.importsPerMinute,
      },
      usage: {
        connectionsUsed: connections.filter((c) => c.status === "CONNECTED").length,
        importsToday: slackImportCountToday + notionImportCountToday,
      },
      canManageIntegrations,
      // Autopilot stats for automation page
      autopilot: {
        isConfigured,
        status: isConfigured ? (invoicesWithReminders > 0 ? "ON" : "PARTIAL") : "OFF",
        invoicesCovered: invoicesWithReminders,
        totalInvoices,
        coveragePercent:
          totalInvoices > 0 ? Math.round((invoicesWithReminders / totalInvoices) * 100) : 0,
        last30DaysCollected: Number(paidLast30Days._sum.total || 0),
        invoicesPaidLast30Days: paidLast30Days._count || 0,
        avgDaysFaster: Math.round(avgDaysFaster * 10) / 10,
      },
      integrations: {
        slack: slack
          ? {
              connected: slack.status === "CONNECTED",
              status: slack.status,
              workspaceName: slack.providerWorkspaceName,
              lastError: slack.lastError,
              lastErrorAt: slack.lastErrorAt,
              connectedAt: slack.createdAt,
              // Stats
              channelsWatching: [], // Would need separate table
              threadsToProjects: slackThreadsProcessed,
              draftInvoices: 0, // Would need to track
            }
          : {
              connected: false,
              status: "NOT_CONNECTED",
            },
        notion: notion
          ? {
              connected: notion.status === "CONNECTED",
              status: notion.status,
              workspaceName: notion.providerWorkspaceName,
              lastError: notion.lastError,
              lastErrorAt: notion.lastErrorAt,
              connectedAt: notion.createdAt,
              // Stats
              databasesMapped: databasesMappedCount,
              clientsImported: notionClientsImported,
              projectsImported: notionProjectsImported,
            }
          : {
              connected: false,
              status: "NOT_CONNECTED",
            },
      },
    });
  } catch (error) {
    console.error("[Integration Status Error]", error);
    return NextResponse.json({ error: "Failed to get integration status" }, { status: 500 });
  }
}
