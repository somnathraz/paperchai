"use server";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { sendInvoiceEmail } from "@/lib/invoices/send-invoice";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { prisma } from "@/lib/prisma";
import { assertFeature } from "@/lib/entitlements";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  // Rate limiting - 20 emails per hour per workspace
  const rateCheck = await checkRateLimitByProfile(req, "emailSend", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many emails sent. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { invoiceId, channel = "email", notes, automationEnabled, reminderSettings } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  // Feature Gate: Reminders
  if (automationEnabled) {
    try {
      await assertFeature(workspace.id, session.user.id, "reminders");
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
  }

  try {
    const result = await sendInvoiceEmail({
      invoiceId,
      workspaceId: workspace.id,
      channel,
      notes,
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
      while (count < maxReminders) {
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
