import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { z } from "zod";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const paramsSchema = z.object({
  stepId: z.string().cuid(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
  } catch (error) {
    return NextResponse.json(serializeEntitlementError(error), {
      status: (error as any)?.statusCode || 403,
    });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid reminder step id" }, { status: 422 });
  }
  const { stepId } = parsedParams.data;
  const rateCheck = checkRateLimitByProfile(req, "list", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.error || "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const step = await prisma.invoiceReminderStep.findFirst({
    where: {
      id: stepId,
      schedule: {
        workspaceId: workspace.id,
      },
    },
    include: {
      emailTemplate: {
        select: {
          id: true,
          slug: true,
          name: true,
          subject: true,
        },
      },
      schedule: {
        include: {
          invoice: {
            select: {
              id: true,
              number: true,
              dueDate: true,
              status: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!step) {
    return NextResponse.json({ error: "Reminder step not found" }, { status: 404 });
  }

  const history = await prisma.reminderHistory.findMany({
    where: {
      workspaceId: workspace.id,
      invoiceId: step.schedule.invoice.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    step: {
      id: step.id,
      status: step.status,
      sendAt: step.sendAt,
      index: step.index,
      daysBeforeDue: step.daysBeforeDue,
      daysAfterDue: step.daysAfterDue,
      lastError: step.lastError,
      template: step.emailTemplate,
      invoice: step.schedule.invoice,
      updatedAt: step.updatedAt,
    },
    history,
  });
}
