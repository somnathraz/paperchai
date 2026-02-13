"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { securityConfig } from "@/lib/security/security.config";
import { logCronEvent } from "@/lib/security/audit-log";
import { runRecurringPlan } from "@/lib/invoices/recurring-runner";

const BATCH_LIMIT = 25;

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
        console.warn("[CRON] Unauthorized recurring-invoices/run attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const duePlans = await prisma.recurringInvoicePlan.findMany({
      where: {
        status: "ACTIVE",
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: "asc" },
      take: BATCH_LIMIT,
    });

    const results: Array<Record<string, any>> = [];

    for (const plan of duePlans) {
      try {
        const result = await runRecurringPlan(plan.id, { triggerReason: "SCHEDULED" });
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown recurring run failure";
        results.push({
          planId: plan.id,
          status: "FAILED",
          error: message,
        });
      }
    }

    await logCronEvent("CRON_EXECUTED", "internal/recurring-invoices/run", {
      processed: results.length,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Recurring invoice worker error:", error);
    await logCronEvent("CRON_FAILED", "internal/recurring-invoices/run", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
