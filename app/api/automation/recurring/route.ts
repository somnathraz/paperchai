import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { computeNextRunAt } from "@/lib/invoices/recurring-plans";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";
import { assertLimit } from "@/lib/usage";

const createPlanSchema = z.object({
  name: z.string().trim().min(2).max(120),
  clientId: z.string().cuid(),
  projectId: z.string().cuid().optional().nullable(),
  sourceType: z.enum(["FIXED_TEMPLATE", "MILESTONES_READY", "TIMESHEET_HOURS", "MANUAL_REVIEW"]),
  intervalUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]),
  intervalValue: z.number().int().min(1).max(90),
  monthlyDay: z.number().int().min(1).max(28).optional(),
  startAt: z.string().datetime().optional(),
  autoSend: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  fallbackPolicy: z.enum(["SKIP_AND_NOTIFY", "CREATE_ZERO_DRAFT", "USE_MINIMUM_FEE"]).optional(),
  minimumFee: z.number().int().min(0).optional(),
  dueDaysAfterIssue: z.number().int().min(0).max(120).optional(),
  channel: z.enum(["email", "whatsapp", "both"]).optional(),
  currency: z.string().length(3).optional(),
  templateSlug: z.string().trim().max(120).optional(),
  snapshot: z.record(z.string(), z.any()).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({
        plans: [],
        workspaceReady: false,
        error: "No workspace found",
      });
    }
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "recurringPlans");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      throw error;
    }
    const plans = await prisma.recurringInvoicePlan.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: "ARCHIVED" },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, message: true, createdAt: true, invoiceId: true },
        },
      },
      orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
    });

    return NextResponse.json({
      workspaceReady: true,
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        status: plan.status,
        sourceType: plan.sourceType,
        intervalUnit: plan.intervalUnit,
        intervalValue: plan.intervalValue,
        monthlyDay: plan.monthlyDay,
        nextRunAt: plan.nextRunAt,
        lastRunAt: plan.lastRunAt,
        lastSuccessAt: plan.lastSuccessAt,
        lastError: plan.lastError,
        autoSend: plan.autoSend,
        approvalRequired: plan.approvalRequired,
        fallbackPolicy: plan.fallbackPolicy,
        dueDaysAfterIssue: plan.dueDaysAfterIssue,
        channel: plan.channel,
        currency: plan.currency,
        minimumFee: plan.minimumFee,
        snapshot: plan.snapshot,
        runCount: plan.runCount,
        failureCount: plan.failureCount,
        client: plan.client,
        project: plan.project,
        latestRun: plan.runs[0] || null,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[AUTOMATION_RECURRING_GET]", error);
    return NextResponse.json({ error: "Failed to fetch recurring plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found", code: "WORKSPACE_NOT_READY" },
        { status: 409 }
      );
    }
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "recurringPlans");
      await assertLimit(workspace.id, session.user.id, "recurringPlans");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      throw error;
    }
    const canManage = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can manage recurring plans" },
        { status: 403 }
      );
    }

    const payload = createPlanSchema.parse(await request.json());

    if (payload.sourceType === "MILESTONES_READY" && !payload.projectId) {
      return NextResponse.json(
        { error: "Project is required for milestone-based recurring plans" },
        { status: 422 }
      );
    }

    if (payload.sourceType === "FIXED_TEMPLATE") {
      const hasItems = Array.isArray(payload.snapshot?.items) && payload.snapshot!.items.length > 0;
      if (!hasItems) {
        return NextResponse.json(
          { error: "Fixed template plans require snapshot items" },
          { status: 422 }
        );
      }
    }
    if (
      payload.fallbackPolicy === "USE_MINIMUM_FEE" &&
      (!payload.minimumFee || payload.minimumFee <= 0)
    ) {
      return NextResponse.json(
        { error: "Minimum fee must be greater than 0 when fallback is minimum fee" },
        { status: 422 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { id: payload.clientId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (payload.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: payload.projectId, workspaceId: workspace.id },
        select: { id: true, clientId: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.clientId && project.clientId !== payload.clientId) {
        return NextResponse.json(
          { error: "Selected project does not belong to selected client" },
          { status: 422 }
        );
      }
    }

    const startAt = payload.startAt ? new Date(payload.startAt) : new Date();
    const nextRunAt =
      startAt.getTime() > Date.now()
        ? startAt
        : computeNextRunAt(
            new Date(),
            payload.intervalUnit,
            payload.intervalValue,
            payload.monthlyDay || null
          );

    const created = await prisma.recurringInvoicePlan.create({
      data: {
        workspaceId: workspace.id,
        clientId: payload.clientId,
        projectId: payload.projectId || null,
        name: payload.name,
        sourceType: payload.sourceType,
        status: payload.status || "ACTIVE",
        intervalUnit: payload.intervalUnit,
        intervalValue: payload.intervalValue,
        monthlyDay: payload.monthlyDay || null,
        nextRunAt,
        autoSend: payload.autoSend ?? false,
        approvalRequired: payload.approvalRequired ?? true,
        fallbackPolicy: payload.fallbackPolicy || "SKIP_AND_NOTIFY",
        minimumFee: payload.minimumFee,
        dueDaysAfterIssue: payload.dueDaysAfterIssue ?? 7,
        channel: payload.channel || "email",
        currency: payload.currency || "INR",
        snapshot:
          payload.snapshot || payload.templateSlug
            ? {
                ...(payload.snapshot || {}),
                ...(payload.templateSlug ? { templateSlug: payload.templateSlug } : {}),
              }
            : undefined,
        createdByUserId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        nextRunAt: true,
      },
    });

    return NextResponse.json({
      plan: created,
      message: "Recurring plan created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.issues },
        { status: 422 }
      );
    }
    console.error("[AUTOMATION_RECURRING_POST]", error);
    return NextResponse.json({ error: "Failed to create recurring plan" }, { status: 500 });
  }
}
