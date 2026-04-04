"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth-tokens";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";
import { passwordResetRequestSchema } from "@/lib/api-schemas";
import { securityConfig } from "@/lib/security/security.config";
import { buildAppUrl } from "@/lib/app-url";
import { authPolicy, isActiveUserStatus } from "@/lib/security/auth-policy";
import { checkPersistentAuthRateLimit } from "@/lib/security/persistent-auth-throttle";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const rl = checkIpRateLimit(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const clientInfo = getClientInfo(req);

  try {
    // 1. Rate limiting - 3 reset requests per day per IP
    const rateCheck = await checkPersistentAuthRateLimit(
      req,
      "passwordReset",
      securityConfig.rateLimits.passwordReset.limit,
      securityConfig.rateLimits.passwordReset.windowMs
    ).catch(() => checkRateLimitByProfile(req, "passwordReset"));
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = passwordResetRequestSchema.parse(await req.json());
    const normalizedEmail = parsed.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    // 2. Always return success to prevent email enumeration
    if (!user || !isActiveUserStatus(user.status)) {
      // Log the attempt but don't reveal user doesn't exist
      await logAuditEvent({
        action: "PASSWORD_RESET_REQUESTED",
        resourceType: "USER",
        metadata: {
          email: normalizedEmail,
          found: Boolean(user),
          allowed: user?.status === "ACTIVE",
        },
        ...clientInfo,
      });
      return NextResponse.json({
        success: true,
        message: authPolicy.messages.genericReset,
      });
    }

    // Clear existing reset tokens for this identifier
    await prisma.passwordResetToken.deleteMany({ where: { identifier: normalizedEmail } });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + securityConfig.tokenExpiry.passwordReset);

    await prisma.passwordResetToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
        expires,
      },
    });

    // 3. Audit log
    await logAuditEvent({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      resourceType: "USER",
      resourceId: user.id,
      ...clientInfo,
    });

    const resetUrl = buildAppUrl(`/reset-password?token=${rawToken}`);

    return NextResponse.json({
      success: true,
      message: authPolicy.messages.genericReset,
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 422 }
      );
    }
    console.error("[REQUEST_RESET] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
