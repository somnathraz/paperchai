import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type CooldownResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

let isReady = false;

async function ensureTable(): Promise<void> {
  if (isReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthThrottle" (
      "key" TEXT PRIMARY KEY,
      "count" INTEGER NOT NULL DEFAULT 0,
      "resetAt" TIMESTAMPTZ NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  isReady = true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkPersistentAuthRateLimit(
  request: NextRequest,
  profile: string,
  limit: number,
  windowMs: number,
  extraKey?: string
): Promise<RateLimitResult> {
  await ensureTable();

  const ip = getClientIp(request);
  const key = `${profile}:ip:${ip}${extraKey ? `:${extraKey}` : ""}`;
  const nextResetAt = new Date(Date.now() + windowMs);

  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "AuthThrottle" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextResetAt}, NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "AuthThrottle"."resetAt" <= NOW() THEN 1
        ELSE "AuthThrottle"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "AuthThrottle"."resetAt" <= NOW() THEN ${nextResetAt}
        ELSE "AuthThrottle"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;

  const row = rows[0];
  const allowed = row.count <= limit;
  const remaining = Math.max(0, limit - row.count);

  return {
    allowed,
    limit,
    remaining,
    resetAt: row.resetAt.getTime(),
  };
}

export async function checkPersistentEmailCooldown(
  normalizedEmail: string,
  cooldownType: string,
  cooldownMs: number
): Promise<CooldownResult> {
  await ensureTable();

  const key = `cooldown:${cooldownType}:${normalizedEmail}`;

  const existing = await prisma.$queryRaw<{ resetAt: Date }[]>`
    SELECT "resetAt" FROM "AuthThrottle" WHERE "key" = ${key} LIMIT 1
  `;

  const now = Date.now();
  if (existing.length > 0 && existing[0].resetAt.getTime() > now) {
    return { allowed: false, retryAfterMs: existing[0].resetAt.getTime() - now };
  }

  const nextResetAt = new Date(now + cooldownMs);
  await prisma.$executeRaw`
    INSERT INTO "AuthThrottle" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextResetAt}, NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = 1,
      "resetAt" = ${nextResetAt},
      "updatedAt" = NOW()
  `;

  return { allowed: true };
}
