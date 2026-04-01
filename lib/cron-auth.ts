import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the CRON_SECRET header on internal job endpoints.
 *
 * Callers (Vercel Cron, cron-job.org, etc.) must send:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Returns null if the request is authorised, or a 401 NextResponse to return immediately.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[cron-auth] CRON_SECRET env var is not set — rejecting all cron requests");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== secret) {
    console.warn("[cron-auth] Unauthorised cron request rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
