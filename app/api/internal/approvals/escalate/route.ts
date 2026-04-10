import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { securityConfig } from "@/lib/security/security.config";
import { logCronEvent } from "@/lib/security/audit-log";
import { sendAutomationApprovalEscalationEmail } from "@/lib/invoices/approval-email";

const PENDING_APPROVAL_AGE_HOURS = 24;
const ESCALATION_COOLDOWN_HOURS = 24;
const BATCH_SIZE = 50;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get(securityConfig.cron.secretHeader);
    const expectedSecret = process.env.CRON_SECRET;

    if (securityConfig.cron.requireAuth) {
      if (!expectedSecret) {
        console.error("[CRON] CRON_SECRET not configured");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
      }

      const providedSecret =
        cronHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
      if (providedSecret !== expectedSecret) {
        console.warn("[CRON] Unauthorized approvals/escalate attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const thresholdMs = PENDING_APPROVAL_AGE_HOURS * 60 * 60 * 1000;
    const cooldownMs = ESCALATION_COOLDOWN_HOURS * 60 * 60 * 1000;

    const candidates = await prisma.invoice.findMany({
      where: {
        status: "draft",
      },
      select: {
        id: true,
        workspaceId: true,
        number: true,
        sendMeta: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: BATCH_SIZE,
    });

    const results: Array<Record<string, any>> = [];

    for (const invoice of candidates) {
      const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
      const automation = (sendMeta.automation as Record<string, any>) || {};

      if (automation.approvalStatus !== "PENDING") {
        continue;
      }

      const requestedAt = parseDate(automation.approvalRequestedAt) || invoice.updatedAt;
      const ageMs = now.getTime() - requestedAt.getTime();
      if (ageMs < thresholdMs) {
        continue;
      }

      const lastEscalatedAt = parseDate(automation.lastEscalatedAt);
      if (lastEscalatedAt && now.getTime() - lastEscalatedAt.getTime() < cooldownMs) {
        continue;
      }

      const escalationCount = Number(automation.escalationCount || 0) + 1;
      const ageHours = Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)));

      try {
        const sent = await sendAutomationApprovalEscalationEmail(invoice.id, {
          ageHours,
          escalationCount,
        });

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            sendMeta: {
              ...sendMeta,
              automation: {
                ...automation,
                escalationCount,
                lastEscalatedAt: now.toISOString(),
                lastEscalationStatus: sent ? "SENT" : "NO_APPROVER",
                lastEscalationError: sent ? null : "No approver email available",
              },
            },
          },
        });

        results.push({
          id: invoice.id,
          number: invoice.number,
          status: sent ? "ESCALATED" : "NO_APPROVER",
          escalationCount,
          ageHours,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown escalation error";
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            sendMeta: {
              ...sendMeta,
              automation: {
                ...automation,
                escalationCount,
                lastEscalatedAt: now.toISOString(),
                lastEscalationStatus: "FAILED",
                lastEscalationError: errorMessage,
              },
            },
          },
        });

        results.push({
          id: invoice.id,
          number: invoice.number,
          status: "FAILED",
          escalationCount,
          error: errorMessage,
        });
      }
    }

    await logCronEvent("CRON_EXECUTED", "internal/approvals/escalate", {
      processed: results.length,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Approval escalation worker error:", error);
    await logCronEvent("CRON_FAILED", "internal/approvals/escalate", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
