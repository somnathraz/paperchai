/**
 * Combined daily cron — runs all background jobs in sequence.
 * Vercel Hobby plan allows max 2 cron jobs at daily minimum interval.
 * This consolidates: reminders, scheduled-invoices, automation, recurring-invoices.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { buildAppUrl } from "@/lib/app-url";

const JOBS = [
  "/api/internal/reminders/run",
  "/api/internal/scheduled-invoices/run",
  "/api/internal/automation/run",
  "/api/internal/recurring-invoices/run",
  "/api/internal/billing/renewal-reminders",
] as const;

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const authHeader = req.headers.get("authorization") || `Bearer ${process.env.CRON_SECRET}`;
  const results: Record<string, unknown> = {};

  for (const path of JOBS) {
    try {
      const res = await fetch(buildAppUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: authHeader,
        },
      });
      const body = await res.json().catch(() => ({}));
      results[path] = { status: res.status, ...body };
    } catch (err) {
      results[path] = { error: err instanceof Error ? err.message : "fetch failed" };
    }
  }

  return NextResponse.json({ ok: true, results });
}
