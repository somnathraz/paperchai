import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth-tokens";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { passwordResetRequestSchema } from "@/lib/api-schemas";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { securityConfig } from "@/lib/security/security.config";
import { buildAppUrl } from "@/lib/app-url";
import { authPolicy } from "@/lib/security/auth-policy";
import {
  checkPersistentAuthRateLimit,
  checkPersistentEmailCooldown,
} from "@/lib/security/persistent-auth-throttle";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const rl = checkIpRateLimit(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  try {
    const rateCheck = await checkPersistentAuthRateLimit(
      req,
      "auth",
      securityConfig.rateLimits.auth.limit,
      securityConfig.rateLimits.auth.windowMs
    ).catch(() => checkRateLimitByProfile(req, "auth"));
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = passwordResetRequestSchema.parse(await req.json());
    const normalizedEmail = parsed.email.toLowerCase().trim();
    const cooldown = await checkPersistentEmailCooldown(
      normalizedEmail,
      "verificationEmail",
      securityConfig.emailCooldowns.verificationEmail
    ).catch(() => ({ allowed: true }));
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: "Please wait before requesting another verification link." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    let verifyUrl: string | undefined;
    if (user && !user.emailVerified) {
      await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expires = new Date(Date.now() + securityConfig.tokenExpiry.verificationEmail);

      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: tokenHash,
          expires,
        },
      });

      verifyUrl = buildAppUrl(`/verify-email?token=${rawToken}`);
    }

    return NextResponse.json({
      success: true,
      message: authPolicy.messages.genericVerify,
      verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
    });
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
