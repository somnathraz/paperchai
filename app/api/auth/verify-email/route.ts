"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-tokens";
import { verifyEmailSchema } from "@/lib/api-schemas";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);
  try {
    const parsed = verifyEmailSchema.parse(await req.json());

    const tokenHash = hashToken(parsed.token);
    const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } }),
    ]);

    await logAuditEvent({
      userId: user.id,
      action: "EMAIL_VERIFIED",
      resourceType: "USER",
      resourceId: user.id,
      ...clientInfo,
    });

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
