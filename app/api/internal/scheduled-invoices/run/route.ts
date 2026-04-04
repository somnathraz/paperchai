"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import { sendInvoiceEmail } from "@/lib/invoices/send-invoice";
import { logCronEvent } from "@/lib/security/audit-log";

const LOCK_MINUTES = 5;
const RETRY_DELAY_MINUTES = 30;
const MAX_RETRIES = 3;

type SendChannel = "email" | "whatsapp" | "both";

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const now = new Date();
    const scheduledInvoices = await prisma.invoice.findMany({
      where: {
        status: "scheduled",
        scheduledSendAt: { lte: now },
      },
      select: {
        id: true,
        number: true,
        workspaceId: true,
        deliveryChannel: true,
        sendMeta: true,
      },
      take: 20,
    });

    const results: Array<Record<string, any>> = [];

    for (const invoice of scheduledInvoices) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      const claimed = await prisma.invoice.updateMany({
        where: {
          id: invoice.id,
          status: "scheduled",
          scheduledSendAt: { lte: now },
        },
        data: {
          scheduledSendAt: lockUntil,
        },
      });
      if (claimed.count === 0) {
        continue;
      }

      const existingSendMeta = (invoice.sendMeta as Record<string, any>) || {};
      const existingWorkerMeta = (existingSendMeta.scheduledWorker as Record<string, any>) || {};
      const retryCount = Number(existingWorkerMeta.retryCount || 0);

      try {
        const channel = (invoice.deliveryChannel || "email") as SendChannel;
        const result = await sendInvoiceEmail({
          invoiceId: invoice.id,
          workspaceId: invoice.workspaceId,
          channel,
          sendMeta: {
            scheduledWorker: {
              retryCount: 0,
              lastAttemptAt: new Date().toISOString(),
              status: "SENT",
              lastError: null,
            },
          },
        });

        results.push({
          id: invoice.id,
          number: invoice.number,
          status: "SENT",
          sentTo: result.sentTo,
        });
      } catch (err: any) {
        const message = err instanceof Error ? err.message : "Unknown send error";
        const nextRetryCount = retryCount + 1;
        const terminalFailure = nextRetryCount >= MAX_RETRIES;
        const retryAt = new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: terminalFailure ? "draft" : "scheduled",
            scheduledSendAt: terminalFailure ? null : retryAt,
            sendMeta: {
              ...existingSendMeta,
              scheduledWorker: {
                retryCount: nextRetryCount,
                lastAttemptAt: new Date().toISOString(),
                status: terminalFailure ? "FAILED_TERMINAL" : "FAILED_RETRYING",
                lastError: message,
                nextRetryAt: terminalFailure ? null : retryAt.toISOString(),
              },
            },
          },
        });

        results.push({
          id: invoice.id,
          number: invoice.number,
          status: terminalFailure ? "FAILED_TERMINAL" : "FAILED_RETRYING",
          error: message,
        });
      }
    }

    await logCronEvent("CRON_EXECUTED", "internal/scheduled-invoices/run", {
      processed: results.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scheduled invoice worker error:", error);
    await logCronEvent("CRON_FAILED", "internal/scheduled-invoices/run", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
