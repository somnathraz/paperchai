"use server";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { sendInvoiceEmail } from "@/lib/invoices/send-invoice";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { prisma } from "@/lib/prisma";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";
import { z } from "zod";
import { canSendInvoiceStatus, isValidInvoiceDateOrder } from "@/lib/invoices/workflow-validation";

const reminderSettingsSchema = z.object({
  startDaysBefore: z.number().int().min(0).max(365).optional(),
  followUpDays: z.number().int().min(1).max(90),
  maxReminders: z.number().int().min(1).max(20),
  channels: z
    .array(z.enum(["email", "whatsapp", "both"]))
    .max(3)
    .optional(),
  tone: z.string().max(50).optional(),
  autoStopOnPayment: z.boolean().optional(),
});

const sendInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
  channel: z.enum(["email", "whatsapp", "both"]).optional().default("email"),
  recipientEmail: z.string().email().max(254).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
  notes: z.string().max(5000).optional(),
  automationEnabled: z.boolean().optional().default(false),
  reminderSettings: reminderSettingsSchema.optional(),
});

export async function POST(req: NextRequest) {
  const rl = checkIpRateLimit(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }
  if (!canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limiting - 20 emails per hour per workspace
  const rateCheck = await checkRateLimitByProfile(req, "emailSend", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many emails sent. Please try again later." },
      { status: 429 }
    );
  }

  let invoiceId: string;
  let channel: "email" | "whatsapp" | "both";
  let recipientEmail: string | undefined;
  let idempotencyKey: string | undefined;
  let notes: string | undefined;
  let automationEnabled: boolean;
  let reminderSettings: z.infer<typeof reminderSettingsSchema> | undefined;
  try {
    const parsed = sendInvoiceSchema.parse(await req.json());
    invoiceId = parsed.invoiceId;
    channel = parsed.channel;
    recipientEmail = parsed.recipientEmail;
    idempotencyKey = parsed.idempotencyKey;
    notes = parsed.notes;
    automationEnabled = parsed.automationEnabled;
    reminderSettings = parsed.reminderSettings;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }

  // Feature Gate: Reminders
  if (automationEnabled) {
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      return NextResponse.json({ error: "Feature unavailable" }, { status: 403 });
    }
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: workspace.id },
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      workspaceId: true,
      sendMeta: true,
      client: {
        select: {
          email: true,
        },
      },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (!canSendInvoiceStatus(invoice.status)) {
    return NextResponse.json(
      { error: `Cannot send invoice in '${invoice.status}' status` },
      { status: 409 }
    );
  }
  if (!invoice.dueDate) {
    return NextResponse.json({ error: "Due date is required before sending" }, { status: 422 });
  }
  if (!isValidInvoiceDateOrder(invoice.issueDate, invoice.dueDate)) {
    return NextResponse.json(
      { error: "Due date cannot be earlier than issue date" },
      { status: 422 }
    );
  }
  if (channel !== "whatsapp" && !recipientEmail && !invoice.client?.email) {
    return NextResponse.json(
      { error: "Client email is required for email delivery" },
      { status: 422 }
    );
  }
  const previousSendMeta = (invoice.sendMeta as Record<string, any> | null) || {};
  const previousKey = previousSendMeta?.lastSendRequest?.idempotencyKey;
  if (idempotencyKey && previousKey === idempotencyKey && invoice.status === "sent") {
    return NextResponse.json({
      ok: true,
      idempotentReplay: true,
      invoice,
      emailSent: true,
      sentTo: recipientEmail || invoice.client?.email || null,
      templateUsed: previousSendMeta?.templateSlug || "default",
    });
  }

  try {
    const result = await sendInvoiceEmail({
      invoiceId,
      workspaceId: workspace.id,
      channel,
      recipientEmail,
      notes,
      sendMeta: idempotencyKey
        ? {
            lastSendRequest: {
              idempotencyKey,
              at: new Date().toISOString(),
              channel,
            },
          }
        : undefined,
      approvedBy: session.user.id,
    });

    // If automation is enabled, create the schedule
    if (automationEnabled && reminderSettings && result.invoice.dueDate) {
      console.log("Setting up automation for invoice:", invoiceId);

      const dueDate = new Date(result.invoice.dueDate);
      const { startDaysBefore, followUpDays, maxReminders, channels, tone, autoStopOnPayment } =
        reminderSettings;

      // 1. Create/Update Schedule Header
      const schedule = await prisma.invoiceReminderSchedule.upsert({
        where: { invoiceId },
        create: {
          invoiceId,
          workspaceId: workspace.id,
          enabled: true,
          useDefaults: false,
          createdByUserId: session.user.id,
        },
        update: {
          enabled: true,
          useDefaults: false,
          updatedAt: new Date(),
        },
      });

      // 2. Clear existing pending steps
      await prisma.invoiceReminderStep.deleteMany({
        where: { scheduleId: schedule.id, status: "PENDING" },
      });

      // 3. Generate Steps
      const stepsData = [];
      let count = 0;

      // Step A: Pre-due or On-due reminder (The "Start" one)
      // If startDaysBefore is defined, we create this initial step.
      if (typeof startDaysBefore === "number") {
        const startAt = new Date(dueDate);
        startAt.setDate(startAt.getDate() - startDaysBefore);

        // Only schedule if it's in the future (or very close to now)
        if (startAt.getTime() > Date.now()) {
          stepsData.push({
            scheduleId: schedule.id,
            index: count++,
            daysBeforeDue: startDaysBefore,
            daysAfterDue: 0,
            offsetFromDueInMinutes: -1 * startDaysBefore * 1440,
            sendAt: startAt,
            status: "PENDING",
            emailTemplateId: null, // Use default logic
          });
        }
      }

      // Step B: Follow-ups (Post-due)
      // Continue until we reach maxReminders
      let followUpIndex = 1;
      while (count < maxReminders && followUpDays > 0) {
        const daysAfter = followUpIndex * followUpDays;
        const followUpAt = new Date(dueDate);
        followUpAt.setDate(followUpAt.getDate() + daysAfter);

        stepsData.push({
          scheduleId: schedule.id,
          index: count++, // 0-based global index
          daysBeforeDue: 0,
          daysAfterDue: daysAfter,
          offsetFromDueInMinutes: daysAfter * 1440,
          sendAt: followUpAt,
          status: "PENDING",
          emailTemplateId: null,
        });
        followUpIndex++;
      }

      if (stepsData.length > 0) {
        await prisma.invoiceReminderStep.createMany({
          data: stepsData,
        });

        // Also update invoice flags if specific fields exist
        // The sendInvoiceEmail already updated some meta, but let's ensure db flags
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { remindersEnabled: true },
        });
      }
    }

    console.log(`Invoice ${result.invoice.number} sent successfully to ${result.sentTo}`);

    return NextResponse.json({
      ok: true,
      invoice: result.invoice,
      emailSent: true,
      sentTo: result.sentTo,
      templateUsed: result.templateUsed,
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to send invoice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
