import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { replaceTemplateVariables, TemplateVars } from "@/lib/reminders";
import { getThemeHtml } from "@/lib/email-themes"; // Reusing existing theme generator if possible or just raw body
import { logCronEvent } from "@/lib/security/audit-log";
import { securityConfig } from "@/lib/security/security.config";
import { buildAppUrl } from "@/lib/app-url";

const STEP_RETRY_DELAY_MINUTES = 20;
const MAX_STEP_RETRIES = 3;

async function updateReminderWorkerMeta(
  invoiceId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, sendMeta: true },
  });

  if (!invoice) return;
  const sendMeta = (invoice.sendMeta as Record<string, unknown>) || {};
  const workerMeta = (sendMeta.reminderWorker as Record<string, unknown>) || {};

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      sendMeta: {
        ...sendMeta,
        reminderWorker: {
          ...workerMeta,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });
}

// POST /api/internal/reminders/run
export async function POST(req: NextRequest) {
  try {
    // Auth check: Require CRON_SECRET for production security
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get(securityConfig.cron.secretHeader);
    const expectedSecret = process.env.CRON_SECRET;

    if (securityConfig.cron.requireAuth) {
      if (!expectedSecret) {
        console.error("[CRON] CRON_SECRET not configured");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }

      const providedSecret =
        cronHeader || (authHeader?.startsWith("Bearer ") && authHeader.slice(7));

      if (providedSecret !== expectedSecret) {
        console.warn("[CRON] Unauthorized reminders/run attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();

    // Find pending steps that are due
    const pendingSteps = await prisma.invoiceReminderStep.findMany({
      where: {
        status: "PENDING",
        sendAt: { lte: now },
        schedule: {
          enabled: true, // Schedule must be enabled
          invoice: {
            remindersEnabled: true, // Invoice must have reminders enabled
            status: { not: "paid" }, // Don't remind for paid invoices based on logic
            // Note: Depending on requirements, maybe we remind regardless?
            // Usually sending reminders for PAID invoices is bad.
            // Let's filter out PAID invoices.
          },
        },
      },
      include: {
        schedule: {
          include: {
            invoice: {
              include: {
                client: true,
                workspace: {
                  include: { owner: true }, // to get owner email for notification
                },
              },
            },
          },
        },
        emailTemplate: true,
      },
      take: 50, // process in batches
    });

    const results = [];

    for (const step of pendingSteps) {
      const claimed = await prisma.invoiceReminderStep.updateMany({
        where: { id: step.id, status: "PENDING" },
        data: { status: "PROCESSING", updatedAt: new Date() },
      });
      if (claimed.count === 0) {
        continue;
      }

      const invoice = step.schedule.invoice;
      const client = invoice.client;
      const workspace = invoice.workspace;
      const template = step.emailTemplate;

      // Skipping logic if invoice is paid
      if (invoice.status === "paid" || invoice.status === "cancelled") {
        await prisma.invoiceReminderStep.update({
          where: { id: step.id },
          data: { status: "SKIPPED", updatedAt: new Date() },
        });
        await updateReminderWorkerMeta(invoice.id, {
          lastStepId: step.id,
          lastStatus: "SKIPPED",
          lastError: null,
        });
        results.push({
          id: step.id,
          status: "SKIPPED",
          reason: `Invoice status is ${invoice.status}`,
        });
        continue;
      }

      if (!client.email) {
        const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
        const workerMeta = (sendMeta.reminderWorker as Record<string, any>) || {};
        const retryByStep = (workerMeta.retryByStep as Record<string, number>) || {};
        const retryCount = Number(retryByStep[step.id] || 0) + 1;
        const shouldRetry = retryCount < MAX_STEP_RETRIES;
        const retryAt = new Date(Date.now() + STEP_RETRY_DELAY_MINUTES * 60 * 1000);

        await prisma.invoiceReminderStep.update({
          where: { id: step.id },
          data: shouldRetry
            ? {
                status: "PENDING",
                lastError: "Client has no email",
                sendAt: retryAt,
                updatedAt: new Date(),
              }
            : { status: "FAILED", lastError: "Client has no email", updatedAt: new Date() },
        });
        await updateReminderWorkerMeta(invoice.id, {
          lastStepId: step.id,
          lastStatus: shouldRetry ? "FAILED_RETRYING" : "FAILED",
          lastError: "Client has no email",
          retryByStep: {
            ...retryByStep,
            [step.id]: retryCount,
          },
          nextRetryAt: shouldRetry ? retryAt.toISOString() : null,
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
        results.push({ id: step.id, status: "FAILED", reason: "No client email" });
        continue;
      }

      if (!template) {
        await prisma.invoiceReminderStep.update({
          where: { id: step.id },
          data: { status: "FAILED", lastError: "Template not found", updatedAt: new Date() },
        });
        await updateReminderWorkerMeta(invoice.id, {
          lastStepId: step.id,
          lastStatus: "FAILED",
          lastError: "Template not found",
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
        results.push({ id: step.id, status: "FAILED", reason: "Template missing" });
        continue;
      }

      // Prepare variables
      // Format currency and date nicely
      const formattedAmount = `${invoice.currency} ${invoice.total}`; // Simplistic formatting
      const formattedDueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString()
        : "N/A";

      const vars: TemplateVars = {
        clientName: client.name,
        invoiceId: invoice.number,
        amount: formattedAmount,
        dueDate: formattedDueDate,
        companyName: workspace.name,
        paymentLink: invoice.paymentLinkUrl || buildAppUrl(`/pay/${invoice.id}`),
      };

      const subject = replaceTemplateVariables(template.subject, vars);

      // Generate themed HTML using the template's theme and branding
      const themedHtml = getThemeHtml(
        (template.theme as "minimal" | "classic" | "modern" | "noir") || "modern",
        {
          subject,
          body: replaceTemplateVariables(template.body, vars),
          brandColor: template.brandColor || "#0f172a",
          logoUrl: template.logoUrl || undefined,
          ...vars,
        }
      );

      // Determine BCC
      const bcc = step.notifyCreator ? workspace.owner?.email : undefined;

      try {
        await sendEmail({
          to: client.email,
          bcc,
          subject,
          html: themedHtml,
          from: workspace.registeredEmail || `noreply@paperchai.com`,
        });

        await prisma.invoiceReminderStep.update({
          where: { id: step.id },
          data: { status: "SENT", updatedAt: new Date() },
        });
        const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
        const workerMeta = (sendMeta.reminderWorker as Record<string, any>) || {};
        const sentCount = Number(workerMeta.sentCount || 0) + 1;
        await updateReminderWorkerMeta(invoice.id, {
          lastStepId: step.id,
          lastStatus: "SENT",
          lastError: null,
          sentCount,
          lastSentAt: new Date().toISOString(),
        });
        results.push({ id: step.id, status: "SENT" });

        // Also log to ReminderHistory? The schema has it.
        // model ReminderHistory { ... }
        // Let's add an entry there too for the "History" tab
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
      } catch (err: any) {
        console.error(`Failed to send reminder step ${step.id}`, err);
        const message = err instanceof Error ? err.message : "Unknown reminder send error";
        const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
        const workerMeta = (sendMeta.reminderWorker as Record<string, any>) || {};
        const retryByStep = (workerMeta.retryByStep as Record<string, number>) || {};
        const retryCount = Number(retryByStep[step.id] || 0) + 1;
        const shouldRetry = retryCount < MAX_STEP_RETRIES;
        const retryAt = new Date(Date.now() + STEP_RETRY_DELAY_MINUTES * 60 * 1000);

        await prisma.invoiceReminderStep.update({
          where: { id: step.id },
          data: shouldRetry
            ? {
                status: "PENDING",
                sendAt: retryAt,
                lastError: message,
                updatedAt: new Date(),
              }
            : { status: "FAILED", lastError: message, updatedAt: new Date() },
        });
        const failedCount = Number(workerMeta.failedCount || 0) + 1;
        await updateReminderWorkerMeta(invoice.id, {
          lastStepId: step.id,
          lastStatus: shouldRetry ? "FAILED_RETRYING" : "FAILED",
          lastError: message,
          failedCount,
          retryByStep: {
            ...retryByStep,
            [step.id]: retryCount,
          },
          nextRetryAt: shouldRetry ? retryAt.toISOString() : null,
        });

        results.push({
          id: step.id,
          status: shouldRetry ? "FAILED_RETRYING" : "FAILED",
          error: message,
        });
      }
    }

    await logCronEvent("CRON_EXECUTED", "internal/reminders/run", {
      processed: results.length,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Worker error:", error);
    await logCronEvent("CRON_FAILED", "internal/reminders/run", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
