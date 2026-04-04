import { prisma } from "@/lib/prisma";

let isReady = false;

async function ensureTable(): Promise<void> {
  if (isReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthSessionVersion" (
      "userId" TEXT PRIMARY KEY,
      "version" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  isReady = true;
}

export async function getSessionVersion(userId: string): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRaw<{ version: number }[]>`
    SELECT "version" FROM "AuthSessionVersion" WHERE "userId" = ${userId} LIMIT 1
  `;
  return rows[0]?.version ?? 0;
}

export async function bumpSessionVersion(userId: string): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRaw<{ version: number }[]>`
    INSERT INTO "AuthSessionVersion" ("userId", "version", "updatedAt")
    VALUES (${userId}, 1, NOW())
    ON CONFLICT ("userId")
    DO UPDATE SET
      "version" = "AuthSessionVersion"."version" + 1,
      "updatedAt" = NOW()
    RETURNING "version"
  `;
  return rows[0]?.version ?? 0;
}
