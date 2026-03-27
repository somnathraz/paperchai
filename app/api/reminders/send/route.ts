import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { sendEmail } from "@/lib/email";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";
import { getThemeHtml } from "@/lib/email-themes";
import { buildAppUrl } from "@/lib/app-url";
import { checkEmailCooldown, checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const sendReminderSchema = z.object({
  invoiceId: z.string().cuid().optional(),
  stepId: z.string().cuid().optional(),
  channel: z.enum(["email", "whatsapp", "both"]).optional().default("email"),
});

export async function POST(req: NextRequest) {
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

  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership || !canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = sendReminderSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.invoiceId && !parsed.data.stepId)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }

  const { invoiceId, stepId, channel } = parsed.data;

  // Reminder manual send currently supports email channel only.
  if (channel !== "email") {
    return NextResponse.json(
      { error: "Only email reminders are supported right now" },
      { status: 422 }
    );
  }

  const rateCheck = checkRateLimitByProfile(req, "emailSend", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.error || "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const stepInclude = {
    emailTemplate: true,
    schedule: {
      include: {
        invoice: {
          include: {
            client: true,
            workspace: {
              include: { owner: true },
            },
          },
        },
      },
    },
  } as const;

  const step = stepId
    ? await prisma.invoiceReminderStep.findFirst({
        where: {
          id: stepId,
          schedule: {
            workspaceId: workspace.id,
            enabled: true,
          },
        },
        include: stepInclude,
      })
    : await prisma.invoiceReminderStep.findFirst({
        where: {
          status: { in: ["PENDING", "FAILED"] },
          schedule: {
            workspaceId: workspace.id,
            enabled: true,
            invoiceId,
          },
        },
        include: stepInclude,
        orderBy: [{ status: "asc" }, { index: "asc" }],
      });

  if (!step) {
    return NextResponse.json({ error: "No reminder step found for this invoice" }, { status: 404 });
  }

  if (["SENT", "PROCESSING"].includes(step.status)) {
    return NextResponse.json(
      { error: `Cannot send reminder from '${step.status.toLowerCase()}' step state` },
      { status: 409 }
    );
  }

  const invoice = step.schedule.invoice;
  if (["paid", "cancelled"].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot send reminder for invoice in '${invoice.status}' status` },
      { status: 409 }
    );
  }

  const client = invoice.client;
  if (!client?.email) {
    return NextResponse.json({ error: "Client email is missing" }, { status: 422 });
  }

  const cooldown = checkEmailCooldown(invoice.id, "reminderEmail");
  if (!cooldown.allowed) {
    const retrySeconds = Math.ceil((cooldown.retryAfterMs || 0) / 1000);
    return NextResponse.json(
      { error: `Reminder cooldown active. Retry in ${retrySeconds}s.` },
      { status: 429 }
    );
  }

  const template = step.emailTemplate;
  if (!template) {
    return NextResponse.json({ error: "Reminder email template not found" }, { status: 422 });
  }

  const vars: TemplateVars = {
    clientName: client.name,
    invoiceId: invoice.number,
    amount: `${invoice.currency} ${invoice.total}`,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A",
    companyName: invoice.workspace.name,
    paymentLink: invoice.paymentLinkUrl || buildAppUrl(`/pay/${invoice.id}`),
  };

  const subject = replaceTemplateVariables(template.subject, vars);
  const html = getThemeHtml((template.theme as any) || "modern", {
    subject,
    body: replaceTemplateVariables(template.body, vars),
    brandColor: template.brandColor || "#0f172a",
    logoUrl: template.logoUrl || undefined,
    ...vars,
  });

  try {
    await sendEmail({
      to: client.email,
      bcc: step.notifyCreator ? invoice.workspace.owner?.email : undefined,
      subject,
      html,
      from: invoice.workspace.registeredEmail || "noreply@paperchai.com",
    });

    await prisma.invoiceReminderStep.update({
      where: { id: step.id },
      data: {
        status: "SENT",
        lastError: null,
        updatedAt: new Date(),
      },
    });

    await prisma.reminderHistory.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        invoiceId: invoice.id,
        channel: "email",
        kind: "reminder",
        status: "sent",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, stepId: step.id, invoiceId: invoice.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminder";
    await prisma.invoiceReminderStep.update({
      where: { id: step.id },
      data: {
        status: "FAILED",
        lastError: message.slice(0, 500),
        updatedAt: new Date(),
      },
    });

    await prisma.reminderHistory.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        invoiceId: invoice.id,
        channel: "email",
        kind: "reminder",
        status: "failed",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}
