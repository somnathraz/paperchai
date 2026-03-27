import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeSendAt } from "@/lib/reminders";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { z } from "zod";

const reminderStepSchema = z.object({
  index: z.number().int().min(0).max(50),
  daysBeforeDue: z.number().int().min(0).max(365).optional(),
  daysAfterDue: z.number().int().min(0).max(365).optional(),
  offsetFromDueInMinutes: z.number().int().min(-525600).max(525600).optional(),
  emailTemplateId: z.string().cuid().optional(),
  templateSlug: z.string().max(100).optional(),
  notifyCreator: z.boolean().optional(),
});

const reminderRequestSchema = z.object({
  enabled: z.boolean(),
  useDefaults: z.boolean().optional(),
  steps: z.array(reminderStepSchema).max(10).optional(),
  presetName: z.string().max(100).optional(),
});

// GET /api/invoices/[id]/reminders
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { id } = await params;
    const invoiceId = id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { workspaceId: true, remindersEnabled: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (workspace.id !== invoice.workspaceId) {
      return NextResponse.json({ error: "Unauthorized access to invoice" }, { status: 403 });
    }

    const schedule = await prisma.invoiceReminderSchedule.findUnique({
      where: { invoiceId },
      include: {
        steps: {
          orderBy: { index: "asc" },
          include: { emailTemplate: true },
        },
      },
    });

    return NextResponse.json({ schedule, remindersEnabled: invoice.remindersEnabled });
  } catch (error) {
    console.error("Error fetching invoice reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST /api/invoices/[id]/reminders
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const membership = await getWorkspaceMembership(session.user.id, workspace.id);
    if (!membership) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }
    if (!canWriteWorkspace(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const invoiceId = id;
    const parsed = reminderRequestSchema.parse(await req.json());
    const { enabled, useDefaults, steps, presetName } = parsed;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (workspace.id !== invoice.workspaceId) {
      return NextResponse.json({ error: "Unauthorized access to invoice" }, { status: 403 });
    }

    // Transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Invoice enabled flag
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { remindersEnabled: enabled },
      });

      if (!enabled) {
        // Determine if we should delete the schedule or just mark as disabled?
        // The schema has 'enabled' on schedule too. Let's keep data but disable.
        const existing = await tx.invoiceReminderSchedule.findUnique({ where: { invoiceId } });
        if (existing) {
          return await tx.invoiceReminderSchedule.update({
            where: { invoiceId },
            data: { enabled: false },
          });
        }
        return null;
      }

      // 2. Upsert Schedule
      const schedule = await tx.invoiceReminderSchedule.upsert({
        where: { invoiceId },
        create: {
          invoiceId,
          workspaceId: invoice.workspaceId,
          enabled: true,
          useDefaults: useDefaults ?? false,
          presetName,
          createdByUserId: session.user.id,
        },
        update: {
          enabled: true,
          useDefaults: useDefaults ?? false,
          presetName,
        },
      });

      // 3. Handle Steps
      if (steps && Array.isArray(steps)) {
        // Delete existing steps
        await tx.invoiceReminderStep.deleteMany({
          where: { scheduleId: schedule.id },
        });

        // Create new steps
        for (const step of steps) {
          // Resolve template ID if slug provided
          let emailTemplateId = step.emailTemplateId;
          if (!emailTemplateId && step.templateSlug) {
            const template = await tx.emailTemplate.findUnique({
              where: {
                workspaceId_slug: { workspaceId: invoice.workspaceId, slug: step.templateSlug },
              },
            });
            if (template) emailTemplateId = template.id;
          }

          // Calculate offset and sendAt authoritative
          let offsetFromDueInMinutes = 0;
          if (step.daysBeforeDue) {
            offsetFromDueInMinutes = -step.daysBeforeDue * 24 * 60;
          } else if (step.daysAfterDue) {
            offsetFromDueInMinutes = step.daysAfterDue * 24 * 60;
          } else if (step.offsetFromDueInMinutes !== undefined) {
            offsetFromDueInMinutes = step.offsetFromDueInMinutes;
          }

          // If invoice has no due date, we can't schedule.
          // However, we might want to save the schedule definition even if disabled?
          // But sendAt is required.
          // We'll trust invoice.dueDate. If null, we default to now or throw error?
          // Invoice updates usually enforce due date if reminders enabled?
          if (!invoice.dueDate && enabled) {
            throw new Error("Cannot enable reminders without a due date");
          }

          const referenceDate = invoice.dueDate || new Date(); // Fallback if disabled
          const sendAt = computeSendAt(referenceDate, offsetFromDueInMinutes);

          await tx.invoiceReminderStep.create({
            data: {
              scheduleId: schedule.id,
              index: step.index,
              daysBeforeDue: step.daysBeforeDue,
              daysAfterDue: step.daysAfterDue,
              offsetFromDueInMinutes,
              sendAt,
              emailTemplateId,
              notifyCreator: step.notifyCreator ?? true,
              status: "PENDING",
            },
          });
        }
      }

      return schedule;
    });

    return NextResponse.json({ success: true, schedule: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request payload" },
        { status: 422 }
      );
    }
    console.error("Error updating invoice reminders:", error);
    return NextResponse.json({ error: "Failed to update reminders" }, { status: 500 });
  }
}
