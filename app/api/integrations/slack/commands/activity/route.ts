import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { subDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "integrations");
    } catch (error) {
      return NextResponse.json(serializeEntitlementError(error), {
        status: (error as any)?.statusCode || 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10);
    const requestedDays = Number.parseInt(
      searchParams.get("rangeDays") || `${DEFAULT_RANGE_DAYS}`,
      10
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, MAX_LIMIT))
      : DEFAULT_LIMIT;
    const rangeDays = Number.isFinite(requestedDays)
      ? Math.max(1, Math.min(requestedDays, MAX_RANGE_DAYS))
      : DEFAULT_RANGE_DAYS;
    const since = subDays(new Date(), rangeDays);

    const [
      recentCommands,
      totalCommands,
      createCommands,
      executedCommands,
      failedCommands,
      slackInvoices,
    ] = await Promise.all([
      prisma.botCommandEvent.findMany({
        where: {
          workspaceId: workspace.id,
          source: "SLACK",
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          command: true,
          rawText: true,
          status: true,
          errorMessage: true,
          actorExternalId: true,
          linkedInvoiceId: true,
          createdAt: true,
          processedAt: true,
          invoice: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
        },
      }),
      prisma.botCommandEvent.count({
        where: {
          workspaceId: workspace.id,
          source: "SLACK",
          createdAt: { gte: since },
        },
      }),
      prisma.botCommandEvent.count({
        where: {
          workspaceId: workspace.id,
          source: "SLACK",
          command: "create",
          createdAt: { gte: since },
        },
      }),
      prisma.botCommandEvent.count({
        where: {
          workspaceId: workspace.id,
          source: "SLACK",
          status: "EXECUTED",
          createdAt: { gte: since },
        },
      }),
      prisma.botCommandEvent.count({
        where: {
          workspaceId: workspace.id,
          source: "SLACK",
          status: { in: ["FAILED", "REJECTED"] },
          createdAt: { gte: since },
        },
      }),
      prisma.invoice.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { source: { equals: "slack", mode: "insensitive" } },
            { source: { equals: "slack_command", mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          status: true,
        },
      }),
    ]);

    const slackInvoiceStatusCounts = slackInvoices.reduce<Record<string, number>>(
      (acc, invoice) => {
        const key = invoice.status.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      summary: {
        rangeDays,
        totalCommands,
        createCommands,
        executedCommands,
        failedCommands,
        successRate: totalCommands > 0 ? Math.round((executedCommands / totalCommands) * 100) : 0,
      },
      invoices: {
        totalSlackCreated: slackInvoices.length,
        statusCounts: slackInvoiceStatusCounts,
      },
      commands: recentCommands.map((command) => ({
        id: command.id,
        command: command.command,
        rawText: command.rawText,
        status: command.status,
        errorMessage: command.errorMessage,
        actorExternalId: command.actorExternalId,
        linkedInvoiceId: command.linkedInvoiceId,
        createdAt: command.createdAt.toISOString(),
        processedAt: command.processedAt?.toISOString() || null,
        invoice: command.invoice
          ? {
              id: command.invoice.id,
              number: command.invoice.number,
              status: command.invoice.status,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[Slack Command Activity] Failed to load", error);
    return NextResponse.json(
      { success: false, error: "Failed to load Slack command activity" },
      { status: 500 }
    );
  }
}
