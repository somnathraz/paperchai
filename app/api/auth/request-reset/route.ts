"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, generateToken, hashToken } from "@/lib/auth-tokens";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { logAuditEvent, getClientInfo } from "@/lib/security/audit-log";

export async function POST(req: NextRequest) {
  const clientInfo = getClientInfo(req);

  try {
    // 1. Rate limiting - 3 reset requests per day per IP
    const rateCheck = await checkRateLimitByProfile(req, "passwordReset");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // 2. Always return success to prevent email enumeration
    if (!user) {
      // Log the attempt but don't reveal user doesn't exist
      await logAuditEvent({
        action: "PASSWORD_RESET_REQUESTED",
        resourceType: "USER",
        metadata: { email: normalizedEmail, found: false },
        ...clientInfo,
      });
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Clear existing reset tokens for this identifier
    await prisma.passwordResetToken.deleteMany({ where: { identifier: normalizedEmail } });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expires = addHours(new Date(), 1);

    await prisma.passwordResetToken.create({
      data: {
        identifier: normalizedEmail,
        tokenHash,
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

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("📨 Password reset link:", resetUrl);
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("[REQUEST_RESET] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

