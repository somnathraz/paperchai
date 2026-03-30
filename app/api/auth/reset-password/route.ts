"use server";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-tokens";
import { passwordResetSchema } from "@/lib/api-schemas";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";
import { bumpSessionVersion } from "@/lib/security/auth-session-version";
import { isActiveUserStatus } from "@/lib/security/auth-policy";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);
  try {
    const parsed = passwordResetSchema.parse(await req.json());
    const passwordValue = parsed.password;

    const tokenHash = hashToken(parsed.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { id: true, status: true },
    });
    if (!user || !isActiveUserStatus(user.status)) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(passwordValue, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { password: hashed, emailVerified: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({ where: { identifier: record.identifier } }),
    ]);

    await logAuditEvent({
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      resourceType: "USER",
      resourceId: user.id,
      ...clientInfo,
    });
    await bumpSessionVersion(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
