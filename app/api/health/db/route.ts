export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-auth";
import { securityConfig } from "@/lib/security/security.config";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get(securityConfig.cron.secretHeader);
    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret =
      cronHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
    const hasCronAccess = Boolean(expectedSecret) && providedSecret === expectedSecret;

    if (!hasCronAccess) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, status: "connected" });
  } catch (error) {
    console.error("DB Connection Failed:", error);
    return NextResponse.json({ error: "DB connection check failed" }, { status: 500 });
  }
}
