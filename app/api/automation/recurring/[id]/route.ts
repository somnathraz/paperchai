import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { computeNextRunAt } from "@/lib/invoices/recurring-plans";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";

const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  clientId: z.string().cuid().optional(),
  projectId: z.string().cuid().nullable().optional(),
  sourceType: z
    .enum(["FIXED_TEMPLATE", "MILESTONES_READY", "TIMESHEET_HOURS", "MANUAL_REVIEW"])
    .optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  intervalUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional(),
  intervalValue: z.number().int().min(1).max(90).optional(),
  monthlyDay: z.number().int().min(1).max(28).nullable().optional(),
  nextRunAt: z.string().datetime().optional(),
  autoSend: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  fallbackPolicy: z.enum(["SKIP_AND_NOTIFY", "CREATE_ZERO_DRAFT", "USE_MINIMUM_FEE"]).optional(),
  minimumFee: z.number().int().min(0).nullable().optional(),
  dueDaysAfterIssue: z.number().int().min(0).max(120).optional(),
  channel: z.enum(["email", "whatsapp", "both"]).optional(),
  currency: z.string().length(3).optional(),
  templateSlug: z.string().trim().max(120).nullable().optional(),
  snapshot: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }
    const { id } = await params;
    const plan = await prisma.recurringInvoicePlan.findFirst({
      where: { id, workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      include: {
        client: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            runKey: true,
            status: true,
            message: true,
            invoiceId: true,
            createdAt: true,
            data: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[AUTOMATION_RECURRING_GET_ONE]", error);
    return NextResponse.json({ error: "Failed to fetch recurring plan" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }
    const canManage = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can manage recurring plans" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const payload = updatePlanSchema.parse(await req.json());

    const existing = await prisma.recurringInvoicePlan.findFirst({
      where: { id, workspaceId: workspace.id },
      select: {
        id: true,
        clientId: true,
        sourceType: true,
        projectId: true,
        fallbackPolicy: true,
        minimumFee: true,
        snapshot: true,
        intervalUnit: true,
        intervalValue: true,
        monthlyDay: true,
        nextRunAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (payload.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: payload.clientId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }

    const effectiveClientId = payload.clientId || existing.clientId;
    const effectiveProjectId =
      payload.projectId === undefined ? existing.projectId : payload.projectId;

    if (effectiveProjectId) {
      const project = await prisma.project.findFirst({
        where: { id: effectiveProjectId, workspaceId: workspace.id },
        select: { id: true, clientId: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.clientId && project.clientId !== effectiveClientId) {
        return NextResponse.json(
          { error: "Selected project does not belong to selected client" },
          { status: 422 }
        );
      }
    }
    const effectiveSourceType = payload.sourceType || existing.sourceType;
    if (effectiveSourceType === "MILESTONES_READY" && !effectiveProjectId) {
      return NextResponse.json(
        { error: "Project is required for milestone-based recurring plans" },
        { status: 422 }
      );
    }
    const effectiveFallback = payload.fallbackPolicy || existing.fallbackPolicy;
    const effectiveMinimumFee =
      payload.minimumFee === undefined ? existing.minimumFee : payload.minimumFee;
    if (
      effectiveFallback === "USE_MINIMUM_FEE" &&
      (!effectiveMinimumFee || effectiveMinimumFee <= 0)
    ) {
      return NextResponse.json(
        { error: "Minimum fee must be greater than 0 when fallback is minimum fee" },
        { status: 422 }
      );
    }
    const nextIntervalUnit = payload.intervalUnit || existing.intervalUnit;
    const nextIntervalValue = payload.intervalValue || existing.intervalValue;
    const nextMonthlyDay =
      payload.monthlyDay === undefined ? existing.monthlyDay : payload.monthlyDay;
    const computedNextRunAt = payload.nextRunAt
      ? new Date(payload.nextRunAt)
      : payload.status === "ACTIVE" &&
          (payload.intervalUnit || payload.intervalValue || payload.monthlyDay !== undefined)
        ? computeNextRunAt(new Date(), nextIntervalUnit, nextIntervalValue, nextMonthlyDay)
        : undefined;

    const existingSnapshot = (existing.snapshot as Record<string, any>) || {};
    const nextSnapshot =
      payload.snapshot || payload.templateSlug !== undefined
        ? {
            ...existingSnapshot,
            ...(payload.snapshot || {}),
            ...(payload.templateSlug === undefined
              ? {}
              : payload.templateSlug
                ? { templateSlug: payload.templateSlug }
                : { templateSlug: null }),
          }
        : undefined;

    const updated = await prisma.recurringInvoicePlan.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        clientId: payload.clientId,
        projectId: payload.projectId === undefined ? undefined : payload.projectId,
        sourceType: payload.sourceType,
        status: payload.status,
        intervalUnit: payload.intervalUnit,
        intervalValue: payload.intervalValue,
        monthlyDay: payload.monthlyDay === undefined ? undefined : payload.monthlyDay,
        nextRunAt: computedNextRunAt,
        autoSend: payload.autoSend,
        approvalRequired: payload.approvalRequired,
        fallbackPolicy: payload.fallbackPolicy,
        minimumFee: payload.minimumFee === undefined ? undefined : payload.minimumFee,
        dueDaysAfterIssue: payload.dueDaysAfterIssue,
        channel: payload.channel,
        currency: payload.currency,
        snapshot: nextSnapshot,
        metadata: payload.metadata,
      },
      select: {
        id: true,
        name: true,
        status: true,
        nextRunAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ plan: updated, message: "Recurring plan updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.issues },
        { status: 422 }
      );
    }
    console.error("[AUTOMATION_RECURRING_PATCH]", error);
    return NextResponse.json({ error: "Failed to update recurring plan" }, { status: 500 });
  }
}
